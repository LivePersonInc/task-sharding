const Events = require('events');
const HashRing = require('hashring');

class GenTaskShard extends Events {
    constructor(conf) {
        super();
        this.clusterMonitor = conf.clusterMonitor;
        this.delay = conf.delay===undefined ? 1000 : conf.delay;
        this.allTasks = conf.tasks || [];
        this.handledTasks = {};        
        this.clusterMonitor.on('clusterChange', (me, updatedList) => {
            let myUpdatedTasks = this._myUpdatedTasks(me,updatedList);
            this._removeAccordingTo(myUpdatedTasks);
            clearTimeout(this.calcDiffTimer);
            if (this.delay && this.delay > 0) {
                this.calcDiffTimer = setTimeout(()=>
                    this._addAccordingTo(myUpdatedTasks),this.delay);
            } else {
                this._addAccordingTo(myUpdatedTasks);
            }
        });
    }

    _myUpdatedTasks(me,updatedList) {
        const updatedHashRing = new HashRing(updatedList);
        const isOwnedByMe = task => updatedHashRing.get(task.id) === me;
        return this.allTasks.filter(isOwnedByMe).reduce((acc, task) => {
            acc[task.id] = task;
            return acc;
        }, {});
    }

    _removeAccordingTo(myUpdatedTasks) {
        Object.keys(this.handledTasks)
            .filter(taskId => !myUpdatedTasks[taskId])
            .forEach(oldTaskId => {
                this.emit('taskRemoved', this.handledTasks[oldTaskId]);
                delete this.handledTasks[oldTaskId];
            });
    }

    _addAccordingTo(myUpdatedTasks) {
        Object.keys(myUpdatedTasks)
            .filter(taskId => !this.handledTasks[taskId])
            .forEach(newTaskId => {
                this.emit('taskAdded', myUpdatedTasks[newTaskId], (taskInfo) => this.handledTasks[newTaskId] = taskInfo);
            });            
    }
}

module.exports = GenTaskShard;
