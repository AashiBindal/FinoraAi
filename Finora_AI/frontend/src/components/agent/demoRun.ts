// ⚠️ DEMO DATA — NOT PRODUCED BY ANY MODEL.
// A hand-written example run used only by the "Preview example" button in
// the Agent Workspace, so the execution-log UI can be shown before a real
// AI provider is connected. It is always labelled as demo data in the UI.
// Delete this file (and the button) once real runs are available.

import type { AgentRun } from '../../types'

export const DEMO_RUN: AgentRun = {
  id: -1,
  session_id: 'demo',
  input: 'How far along is our project, and what should we work on next?',
  output:
    'We are about one third of the way through the roadmap. The architecture foundation is in place; the next priority is Phase 1: read the problem statement and fill in the Project Overview.',
  status: 'completed',
  provider: 'demo',
  model: 'example-trace',
  error: '',
  duration_ms: 2140,
  created_at: new Date().toISOString(),
  steps: [
    { index: 0, type: 'thought', content: 'I need the live progress numbers before answering.', tool: null, tool_input: null, duration_ms: 640 },
    { index: 1, type: 'tool_call', content: '', tool: 'get_project_progress', tool_input: {}, duration_ms: 0 },
    {
      index: 2,
      type: 'tool_result',
      content: "{'overall_progress': 32.1, 'completed': 6, 'active': 0, 'pending': 22, 'current_phase': 'Problem Identification'}",
      tool: 'get_project_progress',
      tool_input: null,
      duration_ms: 12,
    },
    { index: 3, type: 'thought', content: 'Current phase is Problem Identification. I can answer now.', tool: null, tool_input: null, duration_ms: 710 },
    { index: 4, type: 'final', content: 'We are about one third of the way through the roadmap…', tool: null, tool_input: null, duration_ms: 0 },
  ],
}
