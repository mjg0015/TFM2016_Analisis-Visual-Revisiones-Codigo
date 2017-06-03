import { GitHubTask } from "./GitHubTask";
import { IUserEntity, UserEntity } from "../../entities/UserEntity";
import { ITaskEntity } from "../../entities/TaskEntity";
import { ITaskRepository } from "../../data/TaskRepository";
import { IUserRepository } from "../../data/UserRepository";
import { IUserService } from "../../services/UserService";
import * as GitHubAPI from "github";

interface Repositories {
    task: ITaskRepository,
    user: IUserRepository
}

export abstract class AbstractUserTask extends GitHubTask {

    private readonly _repositories: Repositories;
    
    protected readonly _userService: IUserService;

    constructor(repositories: Repositories, userService: IUserService, api?: GitHubAPI, apiAuth?: GitHubAPI.Auth) {
        super(repositories.task, api, apiAuth);
        this._userService = userService;
        this._repositories = repositories;
    }

    protected async processUser(username: string): Promise<void> {
        if(username === undefined) return;
        try {
            let userRepo: IUserRepository = this._repositories.user;
            let foundUser: IUserEntity = await userRepo.findOne({
                login: username,
                updated_on_task: this.entity.parentTask.document._id
            });
            if (foundUser === null) {
                let user: IUserEntity = await this.makeApiCall(username);
                user.document.updated_on_task = this.entity.parentTask.document._id;
                await this._userService.createOrUpdate(user);
            }
            await this.updateStats(username);
        } catch (error) {
            this.emitError(error);
            throw error;
        }
    }

    protected async makeApiCall(username: string): Promise<IUserEntity> {
        try {
            let userData: any = await this.API.users.getForUser(<GitHubAPI.Username>{ username });
            console.log(`[${new Date()}] - Getting user #${username}, remaining reqs: ${userData.meta['x-ratelimit-remaining']}`);
            return UserEntity.toEntity(userData.data);
        } catch (error) {
            throw error;
        }
    }

    protected abstract async updateStats(username: string): Promise<void>;

}