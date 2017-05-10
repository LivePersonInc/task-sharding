const TaskSharding = require('../lib/task-sharding.js');

const nodesSource = { //Dummy data source, configure your own data sources, e.g. zk
    selfNode: "myNodeIdentifier",
    nodes: new Set(["myNodeIdentifier", "other1", "other2", "other3","other4","other5"]),
    listNodes() {
        return Promise.resolve(Array.from(this.nodes));
    },
    _randomNode() {
        const number = getRandomInt(1,10);
        const name = "other"+number;
        return name;
    },
    tryAddRandomNode() {
        const node = this._randomNode();
        if(!this.nodes.has(node)) {
            this.nodes.add(node);
            return node;
        }
    },
    tryRemoveRandomNode() {
        const node = this._randomNode();
        if(this.nodes.has(node)) {
            this.nodes.delete(node);
            return node;
        }
    }
}
let currentlyAssigned = 0;

function debug(...args) {
    console.log.apply(console, ["(%s tasks over %s nodes. %s assigned): "+args[0]].concat(taskList.size,nodesSource.nodes.size, currentlyAssigned,args.slice(1)));
}

const taskSharding = new TaskSharding({
    selfNode: "myNodeIdentifier"
});


function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function makeChanges() {
    debug("Making some random changes");
    const remove =  getRandomInt(0,1) && nodesSource.tryRemoveRandomNode();
    if(remove) {
        debug("Removing node %s",remove);
        taskSharding.removeNode(remove);
        debug("Removed node %s",remove);
    }
    const add = getRandomInt(0,1) && nodesSource.tryAddRandomNode();
    if(add) {
        debug("Adding node %s", add);
        taskSharding.addNode(add);
        debug("Added node %s", add);
    }


    setTimeout(makeChanges, getRandomInt(500,1500));
}
const taskList = new Set();
function changeTasks() {
    for(let i = 0; i < 5; ++i) {
        const task = "task"+getRandomInt(1,100);
        if(taskList.has(task)) {
            debug("Deleting existing task %s",task);
            taskList.delete(task);
            taskSharding.removeTask(task);
        }
        else {
            debug("Adding new task %s",task);
            taskList.add(task);
            taskSharding.addTask(task);
        }
    }
    setTimeout(changeTasks, getRandomInt(500,1500));
}

taskSharding.on('ring-updated', () => {
    debug("Ring updated!"); //Don't really need to use this event
});
taskSharding.on('task-assigned', id => {
    ++currentlyAssigned;
    debug("Task assigned %s",id);
})
taskSharding.on('task-revoked', id => {
    --currentlyAssigned;
    debug("Task revoked %s",id);
});


nodesSource.listNodes().then(list => {
    taskSharding.addNode(list);
    makeChanges();
});
changeTasks();