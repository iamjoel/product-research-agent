import { createInterface } from "node:readline/promises";
import { access, appendFile, readFile, writeFile } from "node:fs/promises";
import process from "node:process";

export type TodoItem = {
  content: string;
  status: string;
};

export function printSection(title: string) {
  console.log(`\n=== ${title} ===`);
}

export function printAction(action: string) {
  console.log(`Current action: ${action}`);
}

export function printResult(result: string) {
  console.log(`Result: ${result}`);
}

export async function promptYesNo(question: string) {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    while (true) {
      const answer = (await rl.question(question)).trim().toLowerCase();

      if (answer === "y") {
        return true;
      }

      if (answer === "n") {
        return false;
      }

      console.log("Please enter y or n.");
    }
  } finally {
    rl.close();
  }
}

export function contentToText(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }

  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map((block) => {
      if (typeof block === "string") {
        return block;
      }

      if (
        typeof block === "object" &&
        block !== null &&
        "type" in block &&
        "text" in block &&
        block.type === "text" &&
        typeof block.text === "string"
      ) {
        return block.text;
      }

      return "";
    })
    .join("");
}

function isToolMessageLike(message: unknown) {
  if (!message || typeof message !== "object") {
    return false;
  }

  const candidate = message as Record<string, unknown>;
  return typeof candidate.tool_call_id === "string";
}

export function getLastMessageText(messages: unknown) {
  if (!Array.isArray(messages)) {
    return "";
  }

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];

    if (isToolMessageLike(message)) {
      continue;
    }

    const text = contentToText(
      (message as { content?: unknown } | undefined)?.content,
    ).trim();

    if (text) {
      return text;
    }
  }

  return "";
}

function getMessageKind(message: Record<string, unknown>) {
  if (typeof message.tool_call_id === "string") {
    return "tool";
  }

  if (Array.isArray(message.tool_calls) && message.tool_calls.length > 0) {
    return "assistant_with_tools";
  }

  const constructorName =
    typeof message.constructor?.name === "string"
      ? message.constructor.name
      : "";

  if (constructorName.includes("Human")) {
    return "user";
  }

  if (constructorName.includes("AI")) {
    return "assistant";
  }

  return "message";
}

function formatExecutionLogSection(phaseTitle: string, messages: unknown) {
  if (!Array.isArray(messages)) {
    return `## ${phaseTitle}\n\nNo messages were captured.\n`;
  }

  const sections = messages.map((message, index) => {
    if (!message || typeof message !== "object") {
      return `### Step ${index + 1}\n\nUnrecognized message payload.\n`;
    }

    const candidate = message as Record<string, unknown>;
    const kind = getMessageKind(candidate);
    const content = contentToText(candidate.content).trim();
    const toolCalls = Array.isArray(candidate.tool_calls)
      ? candidate.tool_calls
      : [];
    const toolName =
      typeof candidate.name === "string" ? candidate.name : "unknown";

    if (kind === "tool") {
      return `### Step ${index + 1} - Tool Result\n\nTool: \`${toolName}\`\n\n${content || "No textual tool output."}\n`;
    }

    if (kind === "assistant_with_tools") {
      const toolCallText = toolCalls
        .map((toolCall, toolIndex) => {
          if (!toolCall || typeof toolCall !== "object") {
            return `### Tool Call ${toolIndex + 1}\n\nUnrecognized tool call payload.`;
          }

          const toolCandidate = toolCall as Record<string, unknown>;
          const name =
            typeof toolCandidate.name === "string"
              ? toolCandidate.name
              : "unknown";
          const args =
            toolCandidate.args === undefined
              ? "No arguments."
              : `\`\`\`json\n${JSON.stringify(toolCandidate.args, null, 2)}\n\`\`\``;

          return `#### Tool Call ${toolIndex + 1}\n\nName: \`${name}\`\n\nArguments:\n${args}`;
        })
        .join("\n\n");

      return `### Step ${index + 1} - Assistant Tool Call\n\n${content || "No assistant commentary."}\n\n${toolCallText}\n`;
    }

    if (kind === "user") {
      return `### Step ${index + 1} - User Prompt\n\n${content || "No content."}\n`;
    }

    if (kind === "assistant") {
      return `### Step ${index + 1} - Assistant Response\n\n${content || "No content."}\n`;
    }

    return `### Step ${index + 1} - Message\n\n${content || "No content."}\n`;
  });

  return `## ${phaseTitle}\n\n${sections.join("\n")}\n`;
}

export async function writeExecutionLog(
  filePath: string,
  phaseTitle: string,
  messages: unknown,
  options?: { reset?: boolean },
) {
  const body = `${formatExecutionLogSection(phaseTitle, messages)}\n`;

  if (options?.reset) {
    await writeFile(filePath, `# Agent execution log\n\n${body}`, "utf-8");
    return;
  }

  await appendFile(filePath, body, "utf-8");
}

export async function writeExecutionLogNote(
  filePath: string,
  phaseTitle: string,
  note: string,
) {
  await appendFile(filePath, `## ${phaseTitle}\n\n${note}\n\n`, "utf-8");
}

export async function assertFilesExist(
  filePaths: string[],
  contextLabel: string,
) {
  const missing: string[] = [];

  for (const filePath of filePaths) {
    try {
      await access(filePath);
    } catch {
      missing.push(filePath);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `${contextLabel} did not produce the expected files: ${missing.join(", ")}`,
    );
  }
}

export async function readMarkdownHeadings(filePath: string) {
  const content = await readFile(filePath, "utf-8");

  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("## "))
    .map((line) => line.slice(3).trim());
}

export async function assertReportMatchesTemplate(
  templatePath: string,
  reportPath: string,
) {
  const templateHeadings = await readMarkdownHeadings(templatePath);
  const reportHeadings = await readMarkdownHeadings(reportPath);
  const missingHeadings = templateHeadings.filter(
    (heading) => !reportHeadings.includes(heading),
  );

  if (missingHeadings.length > 0) {
    throw new Error(
      `Report is missing required sections from the template: ${missingHeadings.join(", ")}`,
    );
  }
}

export function extractTodos(payload: unknown): TodoItem[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  for (const value of Object.values(payload as Record<string, unknown>)) {
    if (
      value &&
      typeof value === "object" &&
      "todos" in value &&
      Array.isArray((value as { todos?: unknown[] }).todos)
    ) {
      return ((value as { todos: TodoItem[] }).todos ?? []).map((todo) => ({
        content: todo.content,
        status: todo.status,
      }));
    }
  }

  return [];
}

export function printMarkdownFile(label: string, content: string) {
  console.log(`\n[generated file] ${label}`);
  console.log(content);
}

export function singleLine(text: string, maxLength = 140) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1)}…`;
}
