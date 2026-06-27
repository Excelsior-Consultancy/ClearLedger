from crewai import Agent, Task, Crew, LLM

# Connect directly to your local Ollama instance
local_llm = LLM(
    model="ollama/qwen2.5-coder:32b-instruct-q5_K_M",
    base_url="http://localhost:11434"
)

# Agent 1: The TypeScript Architect
architect = Agent(
    role='Senior TypeScript Architect',
    goal='Design scalable, type-safe architectures and define strict interfaces.',
    backstory='An expert in TS compiler options, strict null checks, and clean architecture.',
    verbose=True,
    llm=local_llm
)

# Agent 2: The React/TS Developer
developer = Agent(
    role='Frontend Engineer',
    goal='Implement highly optimized React components using TypeScript.',
    backstory='Fascinated by performance, hooks, and clean JSX/TSX structures.',
    verbose=True,
    llm=local_llm
)

# Define parallel or sequential tasks for your team
task1 = Task(description='Review the architecture of the current project.', agent=architect, expected_output='A .txt file with your observations and improvement suggestions.')
# task2 = Task(description='Code a React component using those types.', agent=developer, expected_output='A clean TSX file using standard hooks.')

# Assemble the coding company
dev_team = Crew(
    agents=[architect, developer],
    tasks=[task1],
    verbose=True
)

dev_team.kickoff()
