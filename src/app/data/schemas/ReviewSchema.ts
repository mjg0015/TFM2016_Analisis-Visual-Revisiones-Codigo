import * as mongoose from "mongoose";

/**
 * Review Schema class. Defines the schema for
 * a Review.
 * @author Mario Juez <mario@mjuez.com>
 */
export class ReviewSchema {

    /** Gets the Review Schema. */
    public static get schema(): mongoose.Schema {
        let schema = new mongoose.Schema({
            id: Number,
            pull_request_id: Number,
            user: Object,
            body: String,
            commit_id: String,
            state: String,
            html_url: String,
            pull_request_url: String,
            _links: Object
        });

        return schema;
    }

}