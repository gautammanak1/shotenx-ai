import { JobOptimizerInput } from "../types";

export function buildJobOptimizerPrompt(input: JobOptimizerInput): string {
  const template = `You are an expert AI Job Application Strategist with deep knowledge of:
- ATS (Applicant Tracking Systems)
- recruiter behavior
- resume optimization
- hiring decision psychology

Your task is to analyze a candidate's resume against a job description and produce a highly optimized job application.

INPUT:
Resume:
{{resume}}

Job Description:
{{job_description}}

INSTRUCTIONS:

1. Extract required skills, keywords, and expectations from the job
2. Analyze the resume (strengths, weaknesses, missing skills)
3. Generate a match score (0–100) with breakdown:
   - skills
   - experience
   - keywords
4. Rewrite the resume with:
   - strong action verbs
   - measurable impact
   - keyword alignment
5. Generate a tailored cover letter
6. Provide recruiter-style feedback
7. Suggest improvements
8. Estimate shortlist probability (0–100)

OUTPUT STRICTLY IN JSON:

{
  "match_score": number,
  "score_breakdown": {
    "skills": number,
    "experience": number,
    "keywords": number
  },
  "shortlist_probability": number,
  "job_analysis": {
    "skills_required": [],
    "keywords": [],
    "seniority": "",
    "hidden_expectations": []
  },
  "resume_analysis": {
    "strengths": [],
    "weaknesses": [],
    "missing_skills": []
  },
  "optimized_resume": "string",
  "cover_letter": "string",
  "recruiter_feedback": [],
  "improvement_plan": []
}

RULES:
- Return ONLY valid JSON
- No extra text
- Be specific and realistic
- Do not hallucinate fake experience`;

  return template
    .replace("{{resume}}", input.resume)
    .replace("{{job_description}}", input.job_description);
}
