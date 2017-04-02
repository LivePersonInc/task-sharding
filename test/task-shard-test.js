'use strict';
const expect = require('chai').expect;
const Events = require('events');
const GenTaskShard = require('../lib/gen-task-shard');
 
describe('Task Sharding Tests', () => {
 
    it('should fire taskAdded for single task and single node', done => {
        const clusterMonitoringMock = new Events();
        const gts = new GenTaskShard({
            delay: 0,
            tasks: [{ id: 1 }],
            clusterMonitor: clusterMonitoringMock
        });

        gts.on('taskAdded', (newTaskConf, taskInfoAdder) => {
            expect(newTaskConf.id).to.equal(1);
            done();
        });

        clusterMonitoringMock.emit('clusterChange',"node1",["node1"]);
    });
 
    it('should fire taskRemoved when a newNode takes the task', done => {
        const clusterMonitoringMock = new Events();
        const gts = new GenTaskShard({
            delay: 0,
            tasks: [{ id: 1 }],
            clusterMonitor: clusterMonitoringMock
        });

        gts.on('taskAdded', (newTaskConf, taskInfoAdder) => {
            expect(newTaskConf.id).to.equal(1);
            taskInfoAdder({ myobj: "myobjdata", conf: newTaskConf });
            clusterMonitoringMock.emit('clusterChange',"node1",["node1","node2","node3"]);
        });

        gts.on('taskRemoved', (oldTaskInfo) => {
            expect(oldTaskInfo.myobj).to.equal("myobjdata");
            done();
        });

        clusterMonitoringMock.emit('clusterChange',"node1",["node1"]);
    });
});