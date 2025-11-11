import { Router } from 'express';
import { getResults, updateResults, clearResults } from '../controllers/resultsController';

export const resultsRouter = Router();

resultsRouter.get('/', getResults);
resultsRouter.put('/', updateResults);
resultsRouter.delete('/', clearResults);


