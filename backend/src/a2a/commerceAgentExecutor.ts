import { randomUUID } from "node:crypto";
import type { Message, Task, TaskState, TaskStatusUpdateEvent, TextPart } from "@a2a-js/sdk";
import type { AgentExecutor, ExecutionEventBus, RequestContext } from "@a2a-js/sdk/server";
import { buildDraftMandatesFromUserText } from "../ap2/mandateService";

function textFromUserMessage(message: Message): string {
  return message.parts
    .filter((p): p is TextPart => p.kind === "text" && typeof (p as TextPart).text === "string")
    .map((p) => (p as TextPart).text)
    .join("\n")
    .trim();
}

export class CommerceAp2AgentExecutor implements AgentExecutor {
  private readonly cancelledTasks = new Set<string>();

  cancelTask = async (taskId: string, _eventBus: ExecutionEventBus): Promise<void> => {
    this.cancelledTasks.add(taskId);
  };

  async execute(requestContext: RequestContext, eventBus: ExecutionEventBus): Promise<void> {
    const { userMessage, task, taskId, contextId } = requestContext;

    console.info(
      `[CommerceAp2AgentExecutor] message=${userMessage.messageId} task=${taskId} context=${contextId}`
    );

    if (!task) {
      const initialTask: Task = {
        kind: "task",
        id: taskId,
        contextId,
        status: {
          state: "submitted",
          timestamp: new Date().toISOString()
        },
        history: [userMessage],
        metadata: userMessage.metadata
      };
      eventBus.publish(initialTask);
    }

    const working: TaskStatusUpdateEvent = {
      kind: "status-update",
      taskId,
      contextId,
      status: {
        state: "working",
        message: {
          kind: "message",
          role: "agent",
          messageId: randomUUID(),
          parts: [{ kind: "text", text: "Drafting AP2 mandates and payment payload…" }],
          taskId,
          contextId
        },
        timestamp: new Date().toISOString()
      },
      final: false
    };
    eventBus.publish(working);

    const userText = textFromUserMessage(userMessage);
    if (!userText) {
      const failed: TaskStatusUpdateEvent = {
        kind: "status-update",
        taskId,
        contextId,
        status: {
          state: "failed",
          message: {
            kind: "message",
            role: "agent",
            messageId: randomUUID(),
            parts: [{ kind: "text", text: "No text parts found in the user message." }],
            taskId,
            contextId
          },
          timestamp: new Date().toISOString()
        },
        final: true
      };
      eventBus.publish(failed);
      return;
    }

    if (this.cancelledTasks.has(taskId)) {
      const canceled: TaskStatusUpdateEvent = {
        kind: "status-update",
        taskId,
        contextId,
        status: {
          state: "canceled",
          timestamp: new Date().toISOString()
        },
        final: true
      };
      eventBus.publish(canceled);
      return;
    }

    try {
      const bundle = buildDraftMandatesFromUserText(userText);
      const body =
        `Here is a draft AP2-style bundle (unsigned). Use your AP2 / PSP integration to sign and capture.\n\n` +
        `Intent mandate ${bundle.intent_mandate.id} → Payment mandate ${bundle.payment_mandate.id}\n\n` +
        `Next steps:\n${bundle.next_steps.map((s) => `- ${s}`).join("\n")}\n\n` +
        `JSON (machine-readable):\n${JSON.stringify(bundle, null, 2)}`;

      const agentMessage: Message = {
        kind: "message",
        role: "agent",
        messageId: randomUUID(),
        parts: [{ kind: "text", text: body }],
        taskId,
        contextId
      };

      const finalState: TaskState = "completed";
      const finalUpdate: TaskStatusUpdateEvent = {
        kind: "status-update",
        taskId,
        contextId,
        status: {
          state: finalState,
          message: agentMessage,
          timestamp: new Date().toISOString()
        },
        final: true
      };
      eventBus.publish(finalUpdate);
    } catch (error) {
      const message = (error as Error).message;
      const failed: TaskStatusUpdateEvent = {
        kind: "status-update",
        taskId,
        contextId,
        status: {
          state: "failed",
          message: {
            kind: "message",
            role: "agent",
            messageId: randomUUID(),
            parts: [{ kind: "text", text: `Agent error: ${message}` }],
            taskId,
            contextId
          },
          timestamp: new Date().toISOString()
        },
        final: true
      };
      eventBus.publish(failed);
    }
  }
}
