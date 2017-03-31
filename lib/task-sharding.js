const Events = require('events');
const HashRing = require('hashring');
const Zoologist = require('zoologist').Zoologist;
const ServiceInstanceBuilder = require('zoologist').ServiceInstanceBuilder;
const ServiceDiscoveryBuilder = require('zoologist').ServiceDiscoveryBuilder;

class TaskSharding extends Events {
    constructor(zkConnectionString, tasks, conf) {
        super();
        this.serviceName = conf && conf.serviceName || 'my/service/name/v1';
        this.delay = conf && conf.delay || 1000;
        const zoologistClient = Zoologist.newClient(zkConnectionString);
        zoologistClient.start();
        this.serviceInstance = ServiceInstanceBuilder.builder().name(this.serviceName).build();
        this.serviceDiscovery = ServiceDiscoveryBuilder.builder()
            .client(zoologistClient).basePath('services')
            .thisInstance(this.serviceInstance).build();
        this._clusterChange((si, hr) => this.emit('clusterChange', si, hr));
        this.allTasks = tasks || [];
        this.handledTasks = {};

        
        this.on('clusterChange', (myServiceInstance, updatedHashRing) => {
            // remove immedieatly
            this._calcDiff(myServiceInstance, updatedHashRing, { skipAdd: true });

            // schedule additions
            clearTimeout(this.calcDiffTimer);
            this.calcDiffTimer = setTimeout(
                ()=>this._calcDiff(myServiceInstance, updatedHashRing)
                ,this.delay);
        });
    }

    _calcDiff(myServiceInstance, updatedHashRing, options) {
        const isOwnedByMe = task => updatedHashRing.get(task.id) === myServiceInstance.data.id;
        const myTasks = this.allTasks.filter(isOwnedByMe).reduce((acc, task) => {
            acc[task.id] = task;
            return acc;
        }, {});

        Object.keys(this.handledTasks)
            .filter(taskId => !myTasks[taskId])
            .forEach(oldTaskId => {
                this.emit('taskRemoved', this.handledTasks[oldTaskId]);
                delete this.handledTasks[oldTaskId];
            });

        if (!(options && options.skipAdd)) {
            Object.keys(myTasks)
                .filter(taskId => !this.handledTasks[taskId])
                .forEach(newTaskId => {
                    this.emit('taskAdded', myTasks[newTaskId], (taskInfo) => this.handledTasks[newTaskId] = taskInfo);
                });            
        }

    }

    _clusterChange(callback) {
        this.serviceDiscovery.registerService(() => {
            this._watcher(callback)
        });
    }

    _watcher(callback) {
        const absPath = [this.serviceDiscovery.basePath, this.serviceName].join('/');
        this.serviceDiscovery.client.getClientwithConnectionCheck().getChildren(absPath, () => {
            this._watcher(callback);
        }, (err, serviceList) => {
            callback(this.serviceInstance, new HashRing(serviceList));
        });
    }

}

module.exports = TaskSharding;
