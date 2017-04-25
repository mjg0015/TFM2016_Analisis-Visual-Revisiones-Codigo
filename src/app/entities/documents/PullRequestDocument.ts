import * as mongoose from "mongoose";

/**
 * Pull Request mongoose document.
 * Maps a GitHub Pull Request.
 * @author Mario Juez <mario@mjuez.com>
 */
export interface PullRequestDocument extends mongoose.Document {
    id: number,
    url: string,
    html_url: string,
    diff_url: string,
    patch_url: string,
    issue_url: string,
    commits_url: string,
    review_comments_url: string,
    review_comment_url: string,
    comments_url: string,
    statuses_url: string,
    number: number,
    state: string,
    title: string,
    body: string,
    assignee: any,
    milestone: any,
    locked: boolean,
    created_at: Date,
    updated_at: Date,
    closed_at: Date,
    merged_at: Date,
    head: any,
    base: any,
    _links: any,
    user: any,
    merge_commit_sha: string,
    merged: boolean,
    mergeable: boolean,
    merged_by: any,
    comments: number,
    commits: number,
    additions: number,
    deletions: number,
    changed_files: number,
    maintainer_can_modify: boolean
}