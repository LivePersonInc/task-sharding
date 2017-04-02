const Events = require('events');
const HashRing = require('hashring');

class GenTaskShard extends Events {
    constructor(conf) {
        super();
        this.clusterMonitor = conf.clusterMonitor;
        this.configMonitor = conf.configMonitor;
        this.delay = conf.delay===undefined ? 1000 : conf.delay;
        this.allTasksObj = {};
        this.updatedNodeList = [];
        this.handledTasks = {};

        this.clusterMonitor.on('clusterChange', (me, updatedNodeList) => {
            this.updatedNodeList = updatedNodeList;
            this.me = me;
            this._fireEvents();
        });

        this.configMonitor.on('configsAdded', taskConfigObjs => {
            Object.keys(taskConfigObjs)
                .forEach(id=>this.allTasksObj[id]=taskConfigObjs[id]);
            this._fireEvents();
        });

        this.configMonitor.on('configsRemoved', configIdsArray => {
            configIdsArray.forEach(id=>delete this.allTasksObj[id]);
            this._fireEvents();            
        });
    }

    _fireEvents() {
        if (!this.me) // do not know yet who is me.
            return;
        let myUpdatedTasks = this._myUpdatedTasks(this.me,this.updatedNodeList);
        this._removeAccordingTo(myUpdatedTasks);
        clearTimeout(this.calcDiffTimer);
        if (this.delay && this.delay > 0) {
            this.calcDiffTimer = setTimeout(()=>
                this._addAccordingTo(myUpdatedTasks),this.delay);
        } else {
            this._addAccordingTo(myUpdatedTasks);
        }        
    }

    // _taskArrayToObj(taskArray) {
    //     return taskArray.reduce((acc, task) => {
    //         acc[task.id] = task;
    //         return acc;
    //     }, {});        
    // }

    _myUpdatedTasks(me,updatedNodeList) {
        const updatedHashRing = new HashRing(updatedNodeList);
        const myUpdatedTasks = {};
        Object.keys(this.allTasksObj)
            .filter(id => updatedHashRing.get(id) === me)
            .forEach(id=>myUpdatedTasks[id]=this.allTasksObj[id]);
        return myUpdatedTasks;
    }

    // __myUpdatedTasks(me,updatedNodeList) {
    //     const updatedHashRing = new HashRing(updatedNodeList);
    //     const isOwnedByMe = task => updatedHashRing.get(task.id) === me;
    //     return this.allTasks.filter(isOwnedByMe).reduce((acc, task) => {
    //         acc[task.id] = task;
    //         return acc;
    //     }, {});
    // }

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
