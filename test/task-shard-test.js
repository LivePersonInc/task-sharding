'use strict';
const expect = require('chai').expect;
const TaskSharding = require('../lib/task-sharding');
 
describe('Task Sharding Tests', () => {
    beforeEach(()=>{

        this.gts = new TaskSharding({
            delay: 10,
            nodes: []
        });
        this.ownerships = [];
        this.gts.on(TaskSharding.TASK_ASSIGNED_EVENT, (taskId) => {
            console.log("Received ownership %s",taskId);
            const idx = this.ownerships.indexOf(taskId);
            if(idx !== -1) {
                throw new Error("Assigned event for task already assigned", taskId);
            }
            this.ownerships.push(taskId);
        });
        this.gts.on(TaskSharding.TASK_REVOKED_EVENT, (taskId) => {
            console.log("Removed ownership %s",taskId);
            const idx = this.ownerships.indexOf(taskId);
            if(idx === -1) {
                throw new Error("Revoked event for task already revoked", taskId);
            }
            this.ownerships.splice(idx,1);
        });

        this.expectOwnerships = function(ownerships) {
            return new Promise((resolve, reject) => {
                this.gts.on('ring-updated', () => {
                    try {
                        expect(this.ownerships).to.deep.equal(ownerships);
                        resolve();
                    }
                    catch (e) {
                        reject(e);
                    }
                });
            });
        };

    });
 
    it('should fire taskAdded for single task and single node', () => {
        const myTask = "hello";
        this.gts.addTask(myTask);
        this.gts.addNode(["node1"]);
        this.gts.selfNode = "node1";
        return this.expectOwnerships([myTask]);
    });

    // depends on current implementation of hashring in which specific key goes to specific node
    it('distributing tasks into a set of nodes 1/3', () => {
        this.gts.addTask("hello1");
        this.gts.addTask("hello2");
        this.gts.addTask("hello3");
        this.gts.addTask("hello4");
        this.gts.addNode(["node1", "node2","node3"]);
        this.gts.selfNode = "node1";
        return this.expectOwnerships(["hello1","hello2"]);
    });
    it('distributing tasks into a set of nodes 2/3', () => {
        this.gts.addTask("hello1");
        this.gts.addTask("hello2");
        this.gts.addTask("hello3");
        this.gts.addTask("hello4");
        this.gts.addNode(["node1", "node2","node3"]);
        this.gts.selfNode = "node2";
        return this.expectOwnerships(["hello3"]);
    });
    it('distributing tasks into a set of nodes 3/3', () => {
        this.gts.addTask("hello1");
        this.gts.addTask("hello2");
        this.gts.addTask("hello3");
        this.gts.addTask("hello4");
        this.gts.addNode(["node1", "node2","node3"]);
        this.gts.selfNode = "node3";
        return this.expectOwnerships(["hello4"]);
    });
    it('should distribute tasks after node removal', () => {
        this.gts.addTask("hello1");
        this.gts.addTask("hello2");
        this.gts.addTask("hello3");
        this.gts.addTask("hello4");
        this.gts.addNode(["node1", "node2","node3"]);
        this.gts.selfNode = "node3";

        return this.expectOwnerships(["hello4"]).then(() => {
            this.gts.removeNode("node1");
            return this.expectOwnerships(["hello4", "hello2"]);
        }).then(() => {
            this.gts.removeNode("node2");
            return this.expectOwnerships(["hello4", "hello2", "hello1","hello3"]);
        });
    });
 
    // depends on current implementation of hashring in which specific key goes to specific node
    // it('should fire taskRemoved when a newNode takes the task', done => {
    //     gts.on('taskAdded', (newTaskConf, taskInfoAdder) => {
    //         expect(newTaskConf.name).to.equal("hello");
    //         taskInfoAdder({ myobj: "myobjdata", conf: newTaskConf });
    //         clusterMonitorMock.emit('clusterChange',"node1",["node1","node2","node3"]);
    //     });
    //
    //     gts.on('taskRemoved', (oldTaskInfo) => {
    //         expect(oldTaskInfo.myobj).to.equal("myobjdata");
    //         done();
    //     });
    //
    //     configMonitorMock.emit('configsAdded',{otherTask:{ name: "hello" }});
    //     clusterMonitorMock.emit('clusterChange',"node1",["node1"]);
    // });
    //
    // it('should fire taskAdded after config is added', done => {
    //     gts.on('taskAdded', (newTaskConf, taskInfoAdder) => {
    //         expect(newTaskConf.name).to.equal("hello");
    //         done();
    //     });
    //     clusterMonitorMock.emit('clusterChange',"node1",["node1"]);
    //     configMonitorMock.emit('configsAdded',{task1:{ name: "hello" }});
    // });
    //
    // it('should fire taskRemoved after config is removed', done => {
    //     gts.on('taskAdded', (newTaskConf, taskInfoAdder) => {
    //         expect(newTaskConf.name).to.equal("hello");
    //         taskInfoAdder({ myobj: "myobjdata", conf: newTaskConf });
    //         configMonitorMock.emit('configsRemoved', ["task1"]);
    //     });
    //
    //     gts.on('taskRemoved', (oldTaskInfo) => {
    //         expect(oldTaskInfo.myobj).to.equal("myobjdata");
    //         done();
    //     });
    //
    //     configMonitorMock.emit('configsAdded',{task1:{ name: "hello" }});
    //     clusterMonitorMock.emit('clusterChange',"node1",["node1"]);
    // });
});