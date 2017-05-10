const Events = require('events');
const HashRing = require('hashring');

class GenTaskShard extends Events {
    constructor(conf) {
        super();
        conf = Object.assign({
            delay: 3000,
            maxDelay: 60000,
        }, conf || {});
        this._delay = conf.delay;
        this._maxDelay = conf.maxDelay;

        this._taskOwnership = new Map();
        this.setNodes(conf.nodes || []);

        this._selfNode = conf.selfNode;
    }
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
            this._updateTimerMaxTime = Date.now() + this._maxDelay;
        }

        this._updateTimer = setTimeout(() => {
            this._updateTimer = undefined;
            this._updateTimerMaxTime = undefined;
            this._performUpdate();
        }, this._delay);
    }

    _performUpdate() {
        if (!this.selfNode) {
            //The update will be scheduled once selfNode will be set.
            return;
        }

        this._taskOwnership.forEach((oldOwner, id) => {
            const newOwner = this._hashring.get(id);
            this._taskOwnership.set(id, newOwner);
            if(oldOwner !== newOwner) {
                if(this._isSelf(oldOwner)) {
                    this.emit(TASK_REVOKED_EVENT, id);
                }
                else if(this._isSelf(newOwner)) {
                    this.emit(TASK_ASSIGNED_EVENT, id);
                }
            }
        });

        this.emit('ring-updated');
    }

    _isSelf(node) {
        return this.selfNode !== undefined && node === this.selfNode;
    }

    /**
     * Rather expensive, better use add/remove when possible.
     * string for one server
     * array for multiple servers
     * or an object mapping between server names and vnode weight number.
     * @param array
     */
    setNodes(nodes) {
        this._hashring = new HashRing(nodes || []);
        this._scheduleUpdate();
    }

    /**
     * string for one server
     * array for multiple servers
     * or an object mapping between server names and vnode weight number.
     * @param node
     */
    addNode(node) {
        this._hashring.add(node);
        this._scheduleUpdate();
    }

    /**
     * Remove a single node
     * @param node
     */
    removeNode(node) {
        this._hashring.remove(node);
        this._scheduleUpdate();
    }

    get selfNode() {
        return this._selfNode;
    }

    /**
     * Set the self node. Cannot be overwritten (exception is thrown)
     * @param value
     */
    set selfNode(value) {
        if(this._selfNode === value) {
            return;
        }
        if(this._selfNode) {
            throw new Error("Cannot update selfNode");
        }

        this._selfNode = value;
        this._scheduleUpdate();
    }

    removeTask(id) {
        if(this._taskOwnership.has(id)) {
            const owner = this._taskOwnership.get(id);
            this._taskOwnership.delete(id);
            if(this._isSelf(owner)) {
                this.emit(TASK_REVOKED_EVENT, id);
            }
        }
    }
    addTask(id) {
        if(!this._taskOwnership.has(id)) {
            const owner = this._hashring.get(id);
            this._taskOwnership.set(id, owner);
            if(this._isSelf(owner)) {
                this.emit(TASK_ASSIGNED_EVENT, id);
            }
        }
    }
}
const TASK_ASSIGNED_EVENT = GenTaskShard.TASK_ASSIGNED_EVENT = 'task-assigned';
const TASK_REVOKED_EVENT = GenTaskShard.TASK_REVOKED_EVENT = 'task-revoked';

module.exports = GenTaskShard;
