Implement a new feature using specialized agents with explicit Task tool invocations:

[Extended thinking: This workflow orchestrates multiple specialized agents to implement a complete feature from design to deployment. Each agent receives context from previous agents to ensure coherent implementation.]

Use the Task tool to delegate to specialized agents in sequence:

1. **Backend Architecture Design**
   - Use Task tool with subagent_type="roblox-backend-architect" 
   - Prompt: "Design RESTful API and data model and reflex state for: $ARGUMENTS. Include endpoint definitions, datastore schema, reflex store definition, and service boundaries."
   - Save the API design and schema for next agents

2. **Store Implementation**
   - Use Task tool with subagent_type="roblox-reflex-pro"
   - Prompt: "
Create Reflex Store for: $ARGUMENTS. Use the API design from roblox-backend-architect: [include API endpoints and data models from step 1]
You should first update `src/shared/store/state/index.ts` to match the design.
Then generate slice in `src/server/Store/Slices`

"
   - Ensure UI matches the backend API contract

3. **Test Coverage**
   - Use Task tool with subagent_type="roblox-test-automator"
   - Prompt: "Write comprehensive tests for: $ARGUMENTS. Cover both backend API endpoints: [from step 1] and frontend components: [from step 2]"
   - Include unit, integration, and e2e tests

Aggregate results from all agents and present a unified implementation plan.

Feature description: $ARGUMENTS
