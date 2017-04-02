const GenTaskShard = require('./gen-task-shard');
const ClusterMonitor = require('./cluster-monitor-zoologist');


class TaskSharding extends GenTaskShard {
    constructor(zkConnectionString, tasks, conf={}) {
        super({
            delay: conf.delay,
            tasks: tasks,
            clusterMonitor: new ClusterMonitor({
                zkConnectionString: zkConnectionString,
                basePath: 'services',
                serviceName: conf.serviceName
            })
        });
    }
}

module.exports = TaskSharding;
