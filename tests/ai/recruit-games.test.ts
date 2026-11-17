// AI vs AI (recruit) plays every battle of SCENARIOS (now only 000) to the end with legal answers (describeRecruitGames,
// helpers.ts); the legality soak of the AI.
import { describeRecruitGames } from './helpers';
import { failOnAiErrors } from './no-ai-errors';

failOnAiErrors();

describeRecruitGames(0, 1);
