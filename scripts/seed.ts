// Loads content/ into the database. Safe to re-run: it upserts content and
// never touches user data.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Run through `make seed` so .env.local is loaded.");

const db = createClient(url, key, { auth: { persistSession: false } });
const read = (path: string) => JSON.parse(readFileSync(join("content", path), "utf8"));

type SeedQuestion = {
  id: string;
  t: string;
  d: "easy" | "medium" | "hard";
  q: string;
  o: string[];
  a: number;
  e: string;
};

async function must<T>(query: PromiseLike<{ data: T; error: { message: string } | null }>) {
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data as NonNullable<T>;
}

async function seedSyllabus() {
  const topicIds = new Map<string, string>();
  const syllabus = read("syllabus.json");
  for (const [subjectIndex, s] of syllabus.entries()) {
    const subject = await must(
      db
        .from("subjects")
        .upsert(
          {
            slug: s.slug,
            name_bn: s.name_bn,
            name_en: s.name_en,
            description_bn: s.description_bn,
            position: subjectIndex,
          },
          { onConflict: "slug" },
        )
        .select("id")
        .single(),
    );
    let position = 0;
    for (const group of s.groups) {
      for (const [slug, name_bn, name_en] of group.topics) {
        const topic = await must(
          db
            .from("topics")
            .upsert(
              { subject_id: subject.id, slug, name_bn, name_en, group_name: group.name, position: position++ },
              { onConflict: "subject_id,slug" },
            )
            .select("id")
            .single(),
        );
        topicIds.set(`${s.slug}/${slug}`, topic.id);
      }
    }
  }
  return topicIds;
}

async function seedLessons(topicIds: Map<string, string>) {
  const lessons = read("lessons/beginner.json");
  for (const l of lessons) {
    const topicId = topicIds.get(`${l.subject}/${l.topic}`);
    if (!topicId) throw new Error(`Unknown topic ${l.subject}/${l.topic}`);
    await must(
      db.from("lessons").upsert(
        {
          topic_id: topicId,
          level: l.level,
          title: l.title,
          summary: l.summary,
          sections: l.sections,
          estimated_minutes: l.minutes,
        },
        { onConflict: "topic_id,level" },
      ),
    );
  }
  return lessons.length;
}

async function seedQuestions(topicIds: Map<string, string>) {
  let count = 0;
  for (const file of readdirSync("content/questions")) {
    const subject = file.replace(".json", "");
    const questions: SeedQuestion[] = read(`questions/${file}`);
    for (const q of questions) {
      const topicId = topicIds.get(`${subject}/${q.t}`);
      if (!topicId) throw new Error(`Unknown topic ${subject}/${q.t} in ${q.id}`);
      if (q.o.length !== 4 || q.a < 0 || q.a > 3) throw new Error(`Invalid options in ${q.id}`);

      const row = await must(
        db
          .from("questions")
          .upsert(
            {
              external_id: q.id,
              topic_id: topicId,
              collection: "practice",
              difficulty: q.d,
              language: subject === "english" ? "en" : "bn",
              text: q.q,
              source_label: "অনুশীলনের জন্য তৈরি প্রশ্ন",
            },
            { onConflict: "external_id" },
          )
          .select("id")
          .single(),
      );
      // Keep option ids stable so saved attempts still point at real options.
      const options = await must(
        db
          .from("question_options")
          .upsert(
            q.o.map((text, position) => ({ question_id: row.id, position, text })),
            { onConflict: "question_id,position" },
          )
          .select("id, position"),
      );
      const correct = options.find((o) => o.position === q.a);
      await must(
        db.from("question_answers").upsert({
          question_id: row.id,
          correct_option_id: correct!.id,
          explanation_bn: q.e,
        }),
      );
      count++;
    }
  }
  return count;
}

async function seedMockExams() {
  const exams = read("mock-exams.json");
  for (const { sections, ...exam } of exams) {
    const row = await must(
      db.from("mock_exams").upsert(exam, { onConflict: "slug" }).select("id").single(),
    );
    await must(
      db.from("mock_exam_sections").upsert(
        sections.map((section: object, position: number) => ({
          ...section,
          mock_exam_id: row.id,
          position,
        })),
        { onConflict: "mock_exam_id,position" },
      ),
    );
  }
  return exams.length;
}

async function main() {
  const topicIds = await seedSyllabus();
  const lessons = await seedLessons(topicIds);
  const questions = await seedQuestions(topicIds);
  const exams = await seedMockExams();
  console.log(`Seeded ${topicIds.size} topics, ${lessons} lessons, ${questions} questions, ${exams} mock exams.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
