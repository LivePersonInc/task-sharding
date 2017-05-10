const Events = require('events');
const HashRing = require('hashring');


function toIdArray(ids) {
    return Array.isArray(ids) ? ids : [ids];
}

const TaskActions = {
    REMOVE: Symbol("REMOVE"),
    ADD: Symbol("ADD"),
};

class GenTaskShard extends Events {
    constructor(conf) {
        super();
        conf = Object.assign({
            delay: 1000,
            maxDelay: 10000,
        }, conf || {});
        this._delay = conf.delay;
        this._maxDelay = conf.maxDelay;

        this._taskOwnership = new Map();
        this._pedingTaskChanges = new Map();

        this._ringChanged = false;
        this.setNodes(conf.nodes || []);

        this._selfNode = conf.selfNode;

        this.on('ring-changed', () => {
            this._ringChanged = true;
            this._scheduleUpdate();
        });
    }
    _scheduleUpdate() {
        //This is all done to bunch up updates arriving within a minute
        if(this._updateTimer) {
            if(Date.now() < this._updateTimerMaxTime) {
                //We don't want to starve updates if we keep getting a continuous stream of updates.
                return;
            }

            clearTimeout(this._updateTimer);
            this._updateTimer = undefined;
        }
        this._updateTimerMaxTime = Date.now() + this._maxDelay;
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

        const goThrough = this._ringChanged ? new Set(this._taskOwnership.keys()) : false;
        this._ringChanged = false;

        this._pedingTaskChanges.forEach((action, id) => {
            if(action === TaskActions.ADD && !this._taskOwnership.has(id)) {
                const owner = this._hashring.get(id);
                this._taskOwnership.set(id, owner);
                if(this._isSelf(owner)) {
                    this.emit('task-ownership', id);
                }
                if(goThrough) {
                    goThrough.delete(id);
                }
            }
            else if(action === TaskActions.REMOVE && this._taskOwnership.has(id)) {
                const owner = this._taskOwnership.get(id);
                this._taskOwnership.delete(id);
                if(this._isSelf(owner)) {
                    this.emit('task-ownership-removed', id);
                }
                if(goThrough) {
                    goThrough.delete(id);
                }
            }
        });

        if(goThrough) { //in case of hashring update
            //we need to go through all tasks, except those we already checked above.
            goThrough.forEach(id => {
                const oldOwner = this._taskOwnership.get(id);
                const newOwner = this._hashring.get(id);
                this._taskOwnership.set(id, newOwner);
                if(oldOwner !== newOwner) {
                    if(this._isSelf(oldOwner)) {
                        this.emit('task-ownership-removed', id);
                    }
                    else if(this._isSelf(newOwner)) {
                        this.emit('ownership-removed', id);
                    }
                }
            });
        }
    }

    _isSelf(node) {
        return node === this.selfNode;
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
        this.emit('ring-changed');
    }

    /**
     * string for one server
     * array for multiple servers
     * or an object mapping between server names and vnode weight number.
     * @param node
     */
    addNode(node) {
        this._hashring.add(node);
        this.emit('ring-changed');
    }
    removeNode(node) {
        this._hashring.remove(node);
        this.emit('ring-changed');
    }

    get selfNode() {
        return this._selfNode;
    }
    set selfNode(value) {
        if(this._selfNode === value) {
            return;
        }
        if(this._selfNode) {
            throw new Error("Cannot update selfNode");
        }
        this._selfNode = value;
        this.emit('ring-changed');
    }

    removeTasks(ids) {
        toIdArray(ids).forEach(id => {
            this._pedingTaskChanges.set(id, TaskActions.REMOVE);
        });
        this._scheduleUpdate();
    }
    addTasks(ids) {
        toIdArray(ids).forEach(id => { this._pedingTaskChanges.set(id, TaskActions.ADD); });
        this._scheduleUpdate();
    }
}

module.exports = GenTaskShard;
