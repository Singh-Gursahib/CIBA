import { NextResponse } from "next/server";
import { isMockText } from "@/lib/config";
import { generateJson } from "@/lib/ai/gemini";
import { questionsSystemPrompt } from "@/lib/ai/prompts/proposal";
import { getDiscovery } from "@/features/grants/data";
import type { IntakeQuestion } from "@/types/grants";

const QUESTIONS_SCHEMA = {
  type: "object",
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          question: { type: "string" },
          hint: { type: "string" },
          inputType: { type: "string", enum: ["text", "textarea"] },
        },
        required: ["id", "question", "inputType"],
      },
    },
  },
  required: ["questions"],
};

function mockQuestions(): IntakeQuestion[] {
  return [
    { id: "project-title", question: "What is the working title of the project you would fund with this grant?", hint: "A short, descriptive name.", inputType: "text" },
    { id: "total-budget", question: "What is the total project budget, and how much are you requesting from this funder?", hint: "Include any matching or in-kind contributions.", inputType: "textarea" },
    { id: "timeline", question: "What is the proposed timeline, including start date and key milestones?", hint: "For example, a 12 month project with quarterly milestones.", inputType: "textarea" },
    { id: "participants", question: "Who will the project serve, and how many participants or businesses do you expect to reach?", hint: "Be specific about the target group.", inputType: "textarea" },
    { id: "outcomes", question: "What measurable outcomes will demonstrate success?", hint: "For example, jobs created, businesses launched, revenue growth.", inputType: "textarea" },
    { id: "partners", question: "Which partners will be involved, and what will each contribute?", hint: "Name organizations and their roles.", inputType: "textarea" },
  ];
}

export async function POST(req: Request) {
  const { discoveryId } = (await req.json().catch(() => ({}))) as { discoveryId?: string };
  const discovery = discoveryId ? await getDiscovery(discoveryId) : undefined;

  if (isMockText() || !discovery) {
    return NextResponse.json({ questions: mockQuestions() });
  }

  try {
    const result = await generateJson<{ questions: IntakeQuestion[] }>({
      system: questionsSystemPrompt(),
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Grant: ${discovery.title}\nFunder focus: ${discovery.summary}\nEligibility: ${
                discovery.eligibility ?? "not specified"
              }\n${discovery.fit ? `Fit rationale: ${discovery.fit.rationale}` : ""}\n\nProduce the intake questions.`,
            },
          ],
        },
      ],
      responseSchema: QUESTIONS_SCHEMA,
      temperature: 0.5,
    });
    return NextResponse.json({ questions: result.questions?.slice(0, 6) ?? mockQuestions() });
  } catch {
    return NextResponse.json({ questions: mockQuestions() });
  }
}
