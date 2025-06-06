const router = require('express').Router();
const HTTP_STATUS_CODE = require('../enums/httpStatusCode');
const API_ERRORS = require('../enums/apiErrors');
const StreamCompare = require('../models/streamCompare');
const websocketManager = require('../managers/websocket');
const {
    getUserId,
    checkIsReadOnly
} = require('../auth/middleware');
import {
    api
} from '@bisect/ebu-list-sdk';

function isAuthorized(req, res, next) {
    const {
        comparisonID
    } = req.params;

    if (comparisonID) {
        const userId = getUserId(req);

        StreamCompare.findOne({
            owner_id: userId,
            id: comparisonID
        })
            .exec()
            .then((data) => {
                if (data) next();
                else res.status(HTTP_STATUS_CODE.CLIENT_ERROR.NOT_FOUND).send(API_ERRORS.RESOURCE_NOT_FOUND);
            })
            .catch(() => res.status(HTTP_STATUS_CODE.CLIENT_ERROR.NOT_FOUND).send(API_ERRORS.RESOURCE_NOT_FOUND));
    } else next();
}

router.use('/:comparisonID', isAuthorized);

/* Get all StreamCompares found */
router.get('/', (req, res) => {
    const userId = getUserId(req);
    StreamCompare.find({
        owner_id: userId
    })
        .exec()
        .then((data) => res.status(HTTP_STATUS_CODE.SUCCESS.OK).send(data))
        .catch(() => res.status(HTTP_STATUS_CODE.CLIENT_ERROR.NOT_FOUND).send(API_ERRORS.RESOURCE_NOT_FOUND));
});

router.get('/:comparisonID/', (req, res) => {
    const {
        comparisonID
    } = req.params;

    StreamCompare.findOne({
        id: comparisonID
    })
        .exec()
        .then((data) => res.status(HTTP_STATUS_CODE.SUCCESS.OK).send(data))
        .catch(() => res.status(HTTP_STATUS_CODE.CLIENT_ERROR.NOT_FOUND).send(API_ERRORS.RESOURCE_NOT_FOUND));
});

/* Delete a StreamCompare */
router.delete('/:comparisonID/', (req, res) => {
    const {
        comparisonID
    } = req.params;
    const userId = getUserId(req);

    StreamCompare.deleteOne({
        id: comparisonID
    })
        .exec()
        .then((data) => {
            res.status(HTTP_STATUS_CODE.SUCCESS.OK).send(data);
        })
        .then(() => {
            websocketManager.instance().sendEventToUser(userId, {
                event: api.wsEvents.Stream.compare_deleted,
                data: {
                    id: comparisonID
                },
            });
        })
        .catch(() => res.status(HTTP_STATUS_CODE.CLIENT_ERROR.NOT_FOUND).send(API_ERRORS.RESOURCE_NOT_FOUND));
});

/* update */
router.post('/:comparisonID/', checkIsReadOnly, (req, res) => {
    const {
        comparisonID
    } = req.params;
    const userId = getUserId(req);
    const comparison = req.body;

    StreamCompare.findOneAndUpdate({
        id: comparisonID
    }, comparison, {
        new: true
    })
        .exec()
        .then((data) => res.status(HTTP_STATUS_CODE.SUCCESS.OK).send(data))
        .catch(() => res.status(HTTP_STATUS_CODE.CLIENT_ERROR.NOT_FOUND).send(API_ERRORS.RESOURCE_NOT_FOUND));
});

module.exports = router;