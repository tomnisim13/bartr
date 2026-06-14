import './loadEnv';
import express from 'express';
import cors from 'cors';
import { feedRouter } from './routes/feed';
import { interactionsRouter } from './routes/interactions';
import { itemsRouter } from './routes/items';
import { devRouter } from './routes/dev';
import { usersRouter } from './routes/users';

const app = express();
app.use(cors());
app.use(express.json());

app.use(feedRouter);
app.use(interactionsRouter);
app.use(itemsRouter);
app.use(devRouter);
app.use(usersRouter);

export { app };
export { supabase } from './supabase';
