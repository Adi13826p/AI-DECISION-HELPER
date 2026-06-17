import { Router, type IRouter } from "express";
import healthRouter from "./health";
import aiRouter from "./ai";
import extensionRouter from "./extension";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/ai", aiRouter);
router.use("/extension", extensionRouter);

export default router;
