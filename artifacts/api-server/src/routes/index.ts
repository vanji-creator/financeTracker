import { Router, type IRouter } from "express";
import healthRouter from "./health";
import transactionsRouter from "./transactions";
import aiRouter from "./ai";

const router: IRouter = Router();

router.use(healthRouter);
router.use(transactionsRouter);
router.use(aiRouter);

export default router;
