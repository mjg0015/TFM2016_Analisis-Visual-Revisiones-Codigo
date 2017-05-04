import * as mongoose from "mongoose";
import { TaskType } from "../enum/TaskType";

/**
 * Task mongoose document.
 * Maps a Task.
 * @author Mario Juez <mario@mjuez.com>
 */
export interface TaskDocument extends mongoose.Document {
    type: TaskType,
    is_completed: boolean,
    creation_date: Date,
    start_date: Date,
    end_date: Date,
    owner: string,
    repository: string,
    current_page: number,
    parent?: any,
    current_pull_request_number?: number
}