/// <reference types="node" />

const {EventEmitter} = require('events');
const HashRing = require('hashring');

const TASK_ASSIGNED_EVENT = 'task-assigned';
const TASK_REVOKED_EVENT = 'task-revoked';

/**
 * Configuration for the TaskSharding class.
 *
 * @typedef {object} TaskShardingConfig
 * @property {number} [delay] The usual delay in milliseconds until the tasks are rebalanced across the nodes when the list of node changes.
 * @property {number} [maxDelay] The maximal delay in milliseconds until the tasks are rebalanced across the nodes when the list of node changes.
 * @property {Array<string>} [nodes] Initial list of node names that participate in the task sharding. This list should contain the 'selfNode' if present.
 * @property {string} [selfNode] The name of this node.
 */

/**
 * Shard tasks between nodes in a cluster, using consistent hashing.
 *
 * @export
 * @class
 * @extends EventEmitter
 */
class TaskSharding extends EventEmitter {

    /**
     * Creates an instance of TaskSharding.
     *
     * @constructs TaskSharding
     * @param {TaskShardingConfig} [conf] Configuration for the task sharding. If omitted, the default values are used.
     *
     * @memberof TaskSharding
     */
    constructor(conf) {
        super();
        conf = Object.assign({
            delay: 3000,
            maxDelay: 60000,
        }, conf);

        /**
         * The usual delay in milliseconds until the tasks are rebalanced across the nodes when the list of node changes.
         * @private
         * @member {number}
         */
        this._delay = conf.delay;

        /**
         * The maximal delay in milliseconds until the tasks are rebalanced across the nodes when the list of node changes.
         * @private
         * @member {number}
         */
        this._maxDelay = conf.maxDelay;

        /**
         * Contains the mapping between taskId --> node as assigned by the consistent hash ring.
         * @private
         * @member {Map<string, string>}
         */
        this._taskOwnership = new Map();

        this.setNodes(conf.nodes || []);

        /**
         * The name of this node.
         * @private
         * @member {string}
         */
        this._selfNode = conf.selfNode;
    }

    /**
     * Schedules an update after the specified 'delay' (the latest after 'maxDelay').
     *
     * @private
     * @memberof TaskSharding
     */
    _scheduleUpdate() {
        //This is done to bunch up cluster updates arriving within a short period
        if(this._updateTimer) {
            if(Date.now() < this._updateTimerMaxTime) { //there's more room for delays
                //clear current timer
                clearTimeout(this._updateTimer);
                this._updateTimer = undefined;
            }
            else {
                //We don't want to starve updates if we keep getting a continuous stream of updates.
                return;
            }
        }
        else {
            /**
             * The time the update will be scheduled the latest (as specified by the 'maxDelay'.
             * @private
             * @member {number}
             */
            this._updateTimerMaxTime = Date.now() + this._maxDelay;
        }

        /**
         * The timeoutID for the update timer.
         * @private
         * @member {number}
         */
        this._updateTimer = setTimeout(() => {
            this._updateTimer = undefined;
            this._updateTimerMaxTime = undefined;
            this._performUpdate();
        }, this._delay);
    }

    /**
     * Runs an update. Rebalances the tasks based on the current set of available nodes that participate in the task sharding by utilizing the hashring.
     *
     * @private
     * @memberof TaskSharding
     */
    _performUpdate() {
        if (typeof this.selfNode !== 'string') {
            //The update will be scheduled once selfNode will be set.
            return;
        }

        this._taskOwnership.forEach((oldOwner, id) => {
            const newOwner = this._hashring.get(id);
            this._taskOwnership.set(id, newOwner);
            if(oldOwner !== newOwner) {
                if(this._isSelf(oldOwner)) {
                    super.emit(TASK_REVOKED_EVENT, id);
                }
                else if(this._isSelf(newOwner)) {
                    super.emit(TASK_ASSIGNED_EVENT, id);
                }
            }
        });

        super.emit('ring-updated');
    }

    /**
     * Check if the provided 'node' name is equal to the name of this node/instance.
     *
     * @param {string} node The 'node' name to be checked.
     * @return {boolean} true if the 'node' name is equal to the name of this node/instance; else false.
     *
     * @private
     * @memberof TaskSharding
     */
    _isSelf(node) {
        return typeof this.selfNode === 'string' && node === this.selfNode;
    }

    /**
     * Sets/replaces the list of nodes that participate in the task sharding.
     *
     * @param {string|Array<string>|object} nodes The new replacement node(s). String for one server. Array for multiple servers. Object for mapping between server names and vnode weight number.
     *
     * @memberof TaskSharding
     */
    setNodes(nodes) {
        /**
         * The timeoutID for the update timer.
         * @private
         * @member {HashRing}
         */
        this._hashring = new HashRing(nodes || []);
        this._scheduleUpdate();
    }

    /**
     * Adds one or more nodes to the list of nodes that participate in the task sharding.
     *
     * @param {string|Array<string>|object} node The new node(s) that should be added. String for one server. Array for multiple servers. Object for mapping between server names and vnode weight number.
     *
     * @memberof TaskSharding
     */
    addNode(node) {
        this._hashring.add(node);
        this._scheduleUpdate();
    }

    /**
     * Removes one or more nodes from the list of nodes that participate in the task sharding.
     *
     * @param {string|Array<string>|object} node The current node(s) that should be removed. String for one server. Array for multiple servers. Object for mapping between server names and vnode weight number.
     *
     * @memberof TaskSharding
     */
    removeNode(node) {
        this._hashring.remove(node);
        this._scheduleUpdate();
    }

    /**
     * The (self) name of this node/instance. Undefined if not set so far.
     *
     * @member {string}
     *
     * @memberof TaskSharding
     * @return {string}
     */
    get selfNode() {
        return this._selfNode;
    }

    /**
     * Set the (self) name of this node/instance. Cannot be overwritten if already set previously (exception is thrown).
     *
     * @param {string} value The name of this node/instance.
     * @throws {Error} If the name was already set in the past.
     *
     * @memberof TaskSharding
     */
    set selfNode(value) {
        if(this._selfNode === value) {
            return;
        }
        if(typeof this._selfNode === 'string') {
            throw new Error('Cannot update selfNode');
        }
        if(typeof value !== 'string') {
            throw new Error('selfNode must be of type "string"');
        }

        this._selfNode = value;
        this._scheduleUpdate();
    }

    /**
     * Removes a task by its id.
     *
     * @param {string} id The task id that should be removed.
     * @return {boolean} true if the task was removed (since it was present); else false.
     *
     * @memberof TaskSharding
     */
    removeTask(id) {
        const owner = this._taskOwnership.get(id);
        if(typeof owner === 'string') {
            this._taskOwnership.delete(id);
            if(this._isSelf(owner)) {
                super.emit(TASK_REVOKED_EVENT, id);
            }
            return true;
        }
        return false;
    }

    /**
     * Adds a task by its id.
     *
     * @param {string} id The task id that should be added.
     * @return {string} The owner node name.
     *
     * @memberof TaskSharding
     */
    addTask(id) {
        let owner = this._taskOwnership.get(id);
        if(typeof owner !== 'string') {
            owner = this._hashring.get(id);
            this._taskOwnership.set(id, owner);
            if(this._isSelf(owner)) {
                super.emit(TASK_ASSIGNED_EVENT, id);
            }
        }
        return owner;
    }

    /**
     * Checks if this node is the owner for the given task (tasks not previously added will return false as well).
     *
     * @param {string} id The task id that should be checked.
     * @return {boolean} true if and only if the selfNode is the owner for the given task; else false.
     *
     * @memberof TaskSharding
     */
    isOwned(id) {
        return this._isSelf(this.getOwner(id));
    }

    /**
     * Gets the owner node name for the task with the given id (task ids not previously added will return undefined).
     *
     * @param {string} id The task id of which the owner should be retrieved.
     * @return {string} The owner node name of the task. 'undefined' if no such task was added previously.
     *
     * @memberof TaskSharding
     */
    getOwner(id) {
        return this._taskOwnership.get(id); //only added tasks will be returned.
    }

    /**
     * Event name when a task gets assigned to this node.
     *
     * @member {string}
     * @static
     * @readonly
     */
    static get TASK_ASSIGNED_EVENT() {
        return TASK_ASSIGNED_EVENT;
    }

    /**
     * Event name when a task gets revoked to this node.
     *
     * @member {string}
     * @static
     * @readonly
     */
    static get TASK_REVOKED_EVENT() {
        return TASK_REVOKED_EVENT;
    }

    // temporary until we have proper inheritance.
    /**
     * Event name when a task gets revoked to this node.
     *
     * @function on
     * @instance
     * @param {string} eventName The name of the event.
     * @param {Function} listener The callback function.
     * @returns {TaskSharding} This TaskSharding instance.
     *
     * @memberof TaskSharding
     */
}

module.exports = TaskSharding;
