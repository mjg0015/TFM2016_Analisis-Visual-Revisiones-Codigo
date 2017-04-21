import { Router, Request, Response, NextFunction } from "express";
import { IGitHubController, GitHubController } from "./GitHubController";
import { IPullRequestService } from "../app/services/PullRequestService";
import { PullRequestDocument } from "../app/entities/documents/PullRequestDocument";
import { IPullRequestEntity, PullRequestEntity } from "../app/entities/PullRequestEntity";
import * as request from 'request';
import * as mongoose from 'mongoose';

/**
 * Pull Request controller interface.
 * @author Mario Juez <mario@mjuez.com>
 */
export interface IPullRequestController extends IGitHubController {

    /**
     * Retrieves a Pull Request from GitHub given an owner, a repository
     * and a pull request id.
     * It creates (if not exist) or updates the pull request in our database.
     * Then, the pull request object is returned as response.
     * @param req   API request.
     * @param res   API response.
     */
    retrieve(req: Request, res: Response): void;

    /**
     * Counts Pull Request number from GitHub given an ownerand  a repository.
     * It creates (if not exist) or updates the pull request in our database.
     * Then, the pull request object is returned as response.
     * @param req   API request.
     * @param res   API response.
     */
    count(req: Request, res: Response): void;
}

/**
 * Pull Request controller.
 * Defines Pull Request requests handling.
 * @extends GitHubController.
 * @implements IPullRequestController.
 */
export class PullRequestController extends GitHubController implements IPullRequestController {

    /** Pull Request service. */
    private readonly _service: IPullRequestService;

    /**
     * Class constructor. Injects Pull Request service dependency.
     * @param service   Pull Request service.
     */
    constructor(service: IPullRequestService) {
        super();
        this._service = service;
    }

    /** @inheritdoc */
    public retrieve(req: Request, res: Response): void {
        let owner: string = req.params.owner;
        let repository: string = req.params.repository;
        let pullRequestId: string = req.params.pull_id;
        let uri: string = `${this.API_URL}/repos/${owner}/${repository}/pulls/${pullRequestId}?${this.API_CREDENTIALS}`;

        request(uri, this.API_OPTIONS, (error: any, response: request.RequestResponse, body: any) => {
            if (error) {
                res.json({ "error": error });
            } else {
                this.handleResponse(response, res, () => {
                    let pullRequest: IPullRequestEntity = this._service.toEntity(body);
                    this._service.createOrUpdate(pullRequest, (err: any, result: IPullRequestEntity) => {
                        if (!err) {
                            res.json(result.document);
                        } else {
                            res.json({ "error": err });
                        }
                    });
                });
            }
        });
    }

    /** @inheritdoc */
    public count(req: Request, res: Response): void {
        let owner: string = req.params.owner;
        let repository: string = req.params.repository;
        let uri: string = `${this.API_URL}/repos/${owner}/${repository}/pulls?${this.API_CREDENTIALS}`;

        request(uri, this.API_OPTIONS, (error: any, response: request.RequestResponse, body: any) => {
            if (error) {
                res.json({ "error": error });
            } else {
                this.handleResponse(response, res, () => {
                    let pullRequestArray: IPullRequestEntity[] = this._service.toEntityArray(body);
                    this._service.createOrUpdateMultiple(pullRequestArray, (err: any, result: IPullRequestEntity[]) => {
                        if (!err) {
                            res.json({ "count": result.length });
                        } else {
                            res.json({ "error": err });
                        }
                    });
                });
            }
        });
    }

}