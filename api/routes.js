import express from 'express';
import { graphController } from './controller.js';

const router = express.Router();

router.post('/generate-graph', graphController.generateInitialGraph);
router.post('/suggest-relationship', graphController.getSuggestions);
router.post('/response', graphController.getFinalResponse);
router.post('/suggest-alternatives', graphController.getAlternativeSuggestions);

export default router;