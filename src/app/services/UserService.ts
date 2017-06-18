import { IPersistenceService } from "../services/IPersistenceService";
import { AbstractPersistenceService } from "../services/AbstractPersistenceService";
import { IUserEntity } from "../entities/UserEntity";
import { UserDocument } from "../entities/documents/UserDocument";
import { IUserRepository } from "../data/UserRepository";
import * as math from "mathjs";

/**
 * IUserService interface.
 * Describes specific functionality for User entities.
 * @author Mario Juez <mario@mjuez.com> 
 */
export interface IUserService extends IPersistenceService<IUserEntity> {

    getUser(username: string): Promise<IUserEntity>;
    getUsersPage(page: number, direction: number): Promise<IUserEntity[]>;
    getUsersByNamePage(page: number, direction: number): Promise<IUserEntity[]>;
    getUsersByPullRequestsPage(page: number, direction: number): Promise<IUserEntity[]>;
    getUsersByReviewsPage(page: number, direction: number): Promise<IUserEntity[]>;
    getUsersByReviewsByStatePage(page: number, state: string, direction: number): Promise<IUserEntity[]>;
    getUsersByReviewCommentsPage(page: number, direction: number): Promise<IUserEntity[]>;
    getUsersStatsMeans(): Promise<Object>;
    getUserPageHandler(type: string): any;

}

/**
 * User services.
 * @author Mario Juez <mario@mjuez.com>
 */
export class UserService extends AbstractPersistenceService<IUserRepository, IUserEntity, UserDocument> implements IUserService {

    /**
     * Class constructor with User repository and
     * pull request service dependency injection.
     * @param repository    Injected User repository.
     */
    constructor(repository: IUserRepository) {
        super(repository);
    }

    public getUser = async (username: string): Promise<IUserEntity> => {
        const repo: IUserRepository = this._repository;
        const filter: Object = { login: username };
        return await repo.findOne(filter);
    }

    public getUsersPage = async (page: number, direction: number): Promise<IUserEntity[]> => {
        return await this.getSortedPage(page, { created_at: direction });
    }

    public getUsersByNamePage = async (page: number, direction: number): Promise<IUserEntity[]> => {
        return await this.getSortedPage(page, { login: direction });
    }

    public getUsersByPullRequestsPage = async (page: number, direction: number): Promise<IUserEntity[]> => {
        return await this.getSortedPage(page, { pull_request_count: direction });
    }

    public getUsersByReviewsPage = async (page: number, direction: number): Promise<IUserEntity[]> => {
        return await this.getSortedPage(page, { reviews_count: direction });
    }

    public getUsersByReviewsByStatePage = async (page: number, state: string, direction: number): Promise<IUserEntity[]> => {
        let sort: Object;
        const upperCaseState: string = state.toUpperCase();
        switch (upperCaseState) {
            case "APPROVED":
                sort = { reviews_approved_count: direction };
                break;
            case "COMMENTED":
                sort = { reviews_commented_count: direction };
                break;
            case "CHANGES_REQUESTED":
                sort = { reviews_changes_requested_count: direction };
                break;
            case "DISMISSED":
                sort = { reviews_dismissed_count: direction };
                break;
            default:
                return [];
        };
        return await this.getSortedPage(page, sort);
    }

    public getUsersByReviewCommentsPage = async (page: number, direction: number): Promise<IUserEntity[]> => {
        return await this.getSortedPage(page, { review_comments_count: direction });
    }

    public getUsersStatsMeans = async (): Promise<Object> => {
        const repo: IUserRepository = this._repository;
        const select: string = 'pull_request_count reviews_count review_comments_count -_id';
        const entities: IUserEntity[] = await repo.retrieve({ select });
        const pullRequestCounts: number[] = this.getUsersStatsArray(entities, "pull_request_count");
        const reviewCounts: number[] = this.getUsersStatsArray(entities, "reviews_count");
        const reviewCommentCounts: number[] = this.getUsersStatsArray(entities, "review_comments_count");

        const means: Object = {
            pull_request_count: math.ceil(math.mean(pullRequestCounts)),
            reviews_count: math.ceil(math.mean(reviewCounts)),
            review_comments_count: math.ceil(math.mean(reviewCommentCounts))
        };

        return means;
    }

    public getUserPageHandler = (type: string = "NONE"): any => {
        switch (type) {
            case "NONE":
                return this.getUsersPage;
            case "NAME":
                return this.getUsersByNamePage;
            case "PULLREQUESTS":
                return this.getUsersByPullRequestsPage;
            case "REVIEWS":
                return this.getUsersByReviewsPage;
            case "REVIEWSSTATE":
                return this.getUsersByReviewsByStatePage;
            case "REVIEWCOMMENTS":
                return this.getUsersByReviewCommentsPage;
        }
    }

    private getUsersStatsArray(users: IUserEntity[], statsField: string): number[] {
        let array: number[] = users.map((user): number => {
            return user.document[statsField];
        });

        return array;
    }

    protected async findEntity(entity: IUserEntity): Promise<IUserEntity> {
        return await this._repository.findById(entity.id);
    }

}