import { ITaskEntity, TaskEntity } from "../entities/TaskEntity";
import { TaskType } from "../entities/enum/TaskType";
import { TaskDocument } from "../entities/documents/TaskDocument";
import { IPullRequestRepository } from "../data/PullRequestRepository";
import { IReviewRepository } from "../data/ReviewRepository";
import { IReviewCommentRepository } from "../data/ReviewCommentRepository";
import { IUserRepository } from "../data/UserRepository";
import { IRepositoryRepository } from "../data/RepositoryRepository";
import { ITaskRepository } from "../data/TaskRepository";
import { IPullRequestService } from "./PullRequestService";
import { IReviewService } from "./ReviewService";
import { IReviewCommentService } from "./ReviewCommentService";
import { IUserService } from "./UserService";
import { IRepositoryService } from "./RepositoryService";
import { ITask } from "./tasks/ITask";
import { TaskFactory } from "./tasks/TaskFactory";
import { TaskUtil } from "../util/TaskUtil";
import { GitHubUtil } from "../util/GitHubUtil";
import { IRepositories } from "../data/IRepositories";
import { IServices } from "./IServices";

interface TaskManagerError {
    code: number,
    message: Object
    continue_at: Date
}

/**
 * ITaskManagerService interface.
 * Describes specific functionality for Task Manager entity.
 * @author Mario Juez <mario@mjuez.com> 
 */
export interface ITaskManagerService {

    currentTask: ITask;
    error: TaskManagerError;
    getPendingTasks(page?: number): Promise<ITaskEntity[]>;
    getAllTasks(page?: number): Promise<ITaskEntity[]>;
    createTask(owner: string, repository: string): Promise<boolean>;

}

/**
 * Task manager services.
 * @author Mario Juez <mario@mjuez.com>
 */
export class TaskManagerService implements ITaskManagerService {

    private readonly _repositories: IRepositories;

    private readonly _services: IServices;

    private readonly _taskFactory: TaskFactory;

    private _currentTask: ITask;

    private _error: TaskManagerError;

    /**
     * Class constructor
     */
    constructor(repositories: IRepositories, services: IServices) {
        this._repositories = repositories;
        this._services = services;
        this._taskFactory = new TaskFactory(repositories, services);
        this._currentTask = null;
        this.updateCurrentTask();
    }

    public get currentTask(): ITask {
        return this._currentTask;
    }

    public set currentTask(task: ITask) {
        this._currentTask = task;
    }

    public get error(): TaskManagerError {
        return this._error;
    }

    public set error(error: TaskManagerError) {
        this._error = error;
    }

    public async getPendingTasks(page: number = 1): Promise<ITaskEntity[]> {
        const repository: ITaskRepository = this._repositories.task;
        const filter: Object = { is_completed: false };
        return repository.retrieve({ filter, page });
    }

    public async getAllTasks(page: number = 1): Promise<ITaskEntity[]> {
        const repository: ITaskRepository = this._repositories.task;
        return repository.retrieve({ page });
    }

    public async createTask(owner: string, repository: string): Promise<boolean> {
        const isPending: boolean = await this.isPending(owner, repository);
        if (isPending) return true;
        
        const exists: boolean = await GitHubUtil.checkRepository(owner, repository);
        if (exists) {
            const success: boolean = await this.saveTaskAndSubTasks(owner, repository);
            if (success && this.currentTask === null) {
                this.updateCurrentTask();
            }
            return success;
        }
        return false;
    }

    private async isPending(owner: string, repository: string): Promise<boolean> {
        const repo: ITaskRepository = this._repositories.task;
        const filter: Object = { owner, repository, is_completed: false };
        const pendingTasks: ITaskEntity[] = await repo.retrieve({ filter });
        return pendingTasks.length > 0;
    }

    private async saveTaskAndSubTasks(owner: string, repository: string): Promise<boolean> {
        const taskEntity: ITaskEntity = TaskUtil.buildMainTaskEntity(owner, repository);
        try {
            const mainTask: ITask = await this._taskFactory.buildTask(taskEntity);
            const pullsTaskEntity: ITaskEntity = TaskUtil.buildSubTaskEntity(mainTask.entity, TaskType.PULL_REQUESTS);
            const reviewsTaskEntity: ITaskEntity = TaskUtil.buildSubTaskEntity(mainTask.entity, TaskType.REVIEWS);
            const reviewCommentsTaskEntity: ITaskEntity = TaskUtil.buildSubTaskEntity(mainTask.entity, TaskType.REVIEW_COMMENTS);
            const usersPullsTaskEntity: ITaskEntity = TaskUtil.buildSubTaskEntity(mainTask.entity, TaskType.USERS_PULLS);
            const usersReviewsTaskEntity: ITaskEntity = TaskUtil.buildSubTaskEntity(mainTask.entity, TaskType.USERS_REVIEWS);
            const usersReviewCommentsTaskEntity: ITaskEntity = TaskUtil.buildSubTaskEntity(mainTask.entity, TaskType.USERS_REVIEW_COMMENTS);
            const repositoryTaskEntity: ITaskEntity = TaskUtil.buildSubTaskEntity(mainTask.entity, TaskType.REPOSITORY);
            await this._taskFactory.buildTask(pullsTaskEntity);
            await this._taskFactory.buildTask(reviewsTaskEntity);
            await this._taskFactory.buildTask(reviewCommentsTaskEntity);
            await this._taskFactory.buildTask(usersPullsTaskEntity);
            await this._taskFactory.buildTask(usersReviewsTaskEntity);
            await this._taskFactory.buildTask(usersReviewCommentsTaskEntity);
            await this._taskFactory.buildTask(repositoryTaskEntity);
            return true;
        } catch (error) {
            return false;
        }
    }

    private updateCurrentTask = async (): Promise<void> => {
        if (this.error === undefined) {
            console.log("updating task...");
            try {
                let nextTask: ITaskEntity = await this._repositories.task.findNext();
                if (nextTask) {
                    this.currentTask = await this._taskFactory.buildTask(nextTask);
                    this.bindEventListeners();
                    this.currentTask.run();
                } else {
                    this.currentTask = null;
                }
            } catch (error) {
                this.handleDBError(error);
            }
        }
    }

    private bindEventListeners(): void {
        this.currentTask.on("db:error", this.handleDBError);
        this.currentTask.on("api:error", this.handleAPIError);
        this.currentTask.on("task:completed", this.updateCurrentTask);
    }

    private handleDBError = (error): void => {
        console.log(error);
        let date: Date = new Date();
        date.setMinutes(date.getMinutes() + 1);
        this.error = {
            code: 503,
            message: error,
            continue_at: date
        }
        this.handleError();
    }

    private handleAPIError = (error): void => {
        console.log(error);
        if (error.code === 404) {
            this.removeWrongTask();
            this.updateCurrentTask();
        } else {
            let continue_at: Date;
            if (error.code === 403) {
                let milis: number = (<number>error.headers['x-ratelimit-reset']) * 1000;
                continue_at = new Date(milis);
            } else {
                let date: Date = new Date();
                date.setMinutes(date.getMinutes() + 1);
                continue_at = date;
            }
            this.error = {
                code: error.code,
                message: error.message,
                continue_at: continue_at
            }
            this.handleError();
        }
    }

    private async removeWrongTask(): Promise<void> {
        let taskRepo: ITaskRepository = this._repositories.task;
        try {
            await taskRepo.remove({ _id: this.currentTask.entity.document._id });
            await taskRepo.remove({ parent: this.currentTask.entity.document._id });
        } catch (error) {
            this.handleDBError(error);
        }
    }

    private handleError(): void {
        this.currentTask = null;
        let currentDate: Date = new Date();
        let continueDate: Date = this.error.continue_at;
        let difference: number = continueDate.getTime() - currentDate.getTime() + 10;
        if (difference > 0) {
            console.log(`Going to retry on: ${continueDate}`);
            setTimeout(this.continue, difference);
        } else {
            this.continue();
        }
    }

    private continue = (): void => {
        console.log(`[${new Date()}] - Continuing...`);
        this.removeError();
        this.updateCurrentTask();
    }

    private removeError(): void {
        this.error = undefined;
    }
}