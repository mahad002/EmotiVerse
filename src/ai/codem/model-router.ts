/**
 * Model router: maps task type to model name with env vars and fallbacks.
 * Use smaller/cheaper models when possible per plan optimizations.
 */

export type TaskType = 'planning' | 'code_generation' | 'validation' | 'embedding' | 'intent';

const PLANNER_ENV = 'LITELLM_PLANNER_MODEL';
const PLANNER_FALLBACKS = ['llama-3.3-70b-instruct', 'mistral-small-3.1'];
const PLANNER_DEFAULT = 'gpt-oss-120b';

const VALIDATOR_ENV = 'LITELLM_VALIDATOR_MODEL';
const VALIDATOR_FALLBACKS = ['gemma-3-27b-it'];
const VALIDATOR_DEFAULT = 'llama-3.3-70b-instruct';

const CHAT_ENV = 'LITELLM_CHAT_MODEL';
const CHAT_DEFAULT = 'codestral-22b';

const EMBEDDING_ENV = 'LITELLM_EMBEDDING_MODEL';
const EMBEDDING_DEFAULT = 'sfr-embedding-mistral';

function firstDefined(...values: (string | undefined)[]): string {
  for (const v of values) {
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

/**
 * Get model name for a task type. Intent uses planning model (lightweight call).
 */
export function getModelForTask(taskType: TaskType, complexity?: 'low' | 'medium' | 'high'): string {
  switch (taskType) {
    case 'embedding':
      return firstDefined(process.env[EMBEDDING_ENV], EMBEDDING_DEFAULT);

    case 'code_generation':
      return firstDefined(process.env[CHAT_ENV], CHAT_DEFAULT);

    case 'validation':
      return firstDefined(process.env[VALIDATOR_ENV], ...VALIDATOR_FALLBACKS, VALIDATOR_DEFAULT);

    case 'intent':
    case 'planning': {
      // Use cheaper model for low-complexity task decomposition when specified
      if (taskType === 'planning' && complexity === 'low') {
        const fast = process.env.LITELLM_FAST_PLANNER_MODEL || 'mistral-small-3.1';
        if (fast) return fast;
      }
      return firstDefined(
        process.env[PLANNER_ENV],
        ...PLANNER_FALLBACKS,
        PLANNER_DEFAULT
      );
    }

    default:
      return firstDefined(process.env[CHAT_ENV], CHAT_DEFAULT);
  }
}
