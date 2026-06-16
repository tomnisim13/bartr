import './loadEnv';
import express from 'express';
import cors from 'cors';
import { currentUser } from './middleware/currentUser';
import { feedRouter } from './routes/feed';
import { interactionsRouter } from './routes/interactions';
import { itemsRouter } from './routes/items';
import { devRouter } from './routes/dev';
import { usersRouter } from './routes/users';
import { matchesRouter } from './routes/matches';
import { walletRouter } from './routes/wallet';

const app = express();
app.use(cors());
app.use(express.json());
app.use(currentUser);

app.use(feedRouter);
app.use(interactionsRouter);
app.use(itemsRouter);
app.use(devRouter);
app.use(usersRouter);
app.use(matchesRouter);
app.use(walletRouter);

export { app };
export { supabase } from './supabase';
