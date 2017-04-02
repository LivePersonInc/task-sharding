const Events = require('events');
const GenTaskShard = require('./gen-task-shard');
const ClusterMonitor = require('./cluster-monitor-zoologist');


class TaskSharding extends GenTaskShard {
    constructor(zkConnectionString, tasks, conf={}) {
        const configMonitor = new Events();
        super({
            delay: conf.delay,
            configMonitor: configMonitor,
            clusterMonitor: new ClusterMonitor({
                zkConnectionString: zkConnectionString,
                basePath: 'services',
                serviceName: conf.serviceName
            })
        });
        configMonitor.emit('configsAdded', this._taskArrayToObj(tasks || []));
    }

    _taskArrayToObj(taskArray) {
        return taskArray.reduce((acc, task) => {
            acc[task.id] = task;
            return acc;
        }, {});        
    }
}

module.exports = TaskSharding;
