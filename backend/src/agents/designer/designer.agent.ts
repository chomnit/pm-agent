// Designer Agent
// Handles UX/UI, wireframes, user flows, design documentation

import path from 'path'

export const designerAgent = {
  type: 'designer',
  getSkillFile(stageType: string) {
    return path.join(__dirname, 'skills', `${stageType}.skill.md`)
  },
  // Add agent logic here (handler, context assembly, etc.)
}
