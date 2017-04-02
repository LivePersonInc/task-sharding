'use strict';
const expect = require('chai').expect;
const Events = require('events');
const GenTaskShard = require('../lib/gen-task-shard');
 
describe('Task Sharding Tests', () => {
    let clusterMonitorMock;
    let configMonitorMock;
    let gts;

    beforeEach(()=>{
        clusterMonitorMock = new Events();
        configMonitorMock = new Events();
        gts = new GenTaskShard({
            delay: 0,
            configMonitor: configMonitorMock,
            clusterMonitor: clusterMonitorMock
        });
    });
 
    it('should fire taskAdded for single task and single node', done => {
        gts.on('taskAdded', (newTaskConf, taskInfoAdder) => {
            expect(newTaskConf.name).to.equal("hello");
            done();
        });
        configMonitorMock.emit('configsAdded',{task1:{ name: "hello" }});
        clusterMonitorMock.emit('clusterChange',"node1",["node1"]);
    });

    // depends on current implementation of hashring in which specific key goes to specific node
    it('should distribute taskAdded between nodes', done => {
        gts.on('taskAdded', (newTaskConf, taskInfoAdder) => {
            expect(newTaskConf.name).to.equal("hello");
            done();
        });
        configMonitorMock.emit('configsAdded',{task1:{ name: "hello" }, otherTask:{ name: "goodbye" }});
        clusterMonitorMock.emit('clusterChange',"node1",["node1","node2","node3"]);
    });
 
    // depends on current implementation of hashring in which specific key goes to specific node
    it('should fire taskRemoved when a newNode takes the task', done => {
        gts.on('taskAdded', (newTaskConf, taskInfoAdder) => {
            expect(newTaskConf.name).to.equal("hello");
            taskInfoAdder({ myobj: "myobjdata", conf: newTaskConf });
            clusterMonitorMock.emit('clusterChange',"node1",["node1","node2","node3"]);
        });

        gts.on('taskRemoved', (oldTaskInfo) => {
            expect(oldTaskInfo.myobj).to.equal("myobjdata");
            done();
        });

        configMonitorMock.emit('configsAdded',{otherTask:{ name: "hello" }});
        clusterMonitorMock.emit('clusterChange',"node1",["node1"]);
    });

    it('should fire taskAdded after config is added', done => {
        gts.on('taskAdded', (newTaskConf, taskInfoAdder) => {
            expect(newTaskConf.name).to.equal("hello");
            done();
        });
        clusterMonitorMock.emit('clusterChange',"node1",["node1"]);
        configMonitorMock.emit('configsAdded',{task1:{ name: "hello" }});
    });
 
    it('should fire taskRemoved after config is removed', done => {
        gts.on('taskAdded', (newTaskConf, taskInfoAdder) => {
            expect(newTaskConf.name).to.equal("hello");
            taskInfoAdder({ myobj: "myobjdata", conf: newTaskConf });
            configMonitorMock.emit('configsRemoved', ["task1"]);
        });

        gts.on('taskRemoved', (oldTaskInfo) => {
            expect(oldTaskInfo.myobj).to.equal("myobjdata");
            done();
        });

        configMonitorMock.emit('configsAdded',{task1:{ name: "hello" }});
        clusterMonitorMock.emit('clusterChange',"node1",["node1"]);
    });
});