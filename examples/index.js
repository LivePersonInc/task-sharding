const TaskSharding = require('../lib/task-sharding.js');
const taskStore = new Map([
    "id1","id246","id426","id66","id10","id11","id20","id25","id303","id111","id44","id12566"
].map(id => [id,{
    "id":id,
    "name": "Task with id="+id,
    "data": id.length
}]));

let currentlyAssigned = 0;
let currentNodeCount = 0;

function debug(...args) {
    console.log.apply(console, ["%s out of %s tasks assigned - total %s nodes: "+args[0]].concat(currentlyAssigned, taskStore.size, currentNodeCount, args.slice(1)));
}

const taskSharding = new TaskSharding();
taskStore.forEach((task,id) => taskSharding.addTask(id));

taskSharding.on('ring-updated', () => {
    debug("Hashring updated."); //Don't really need to use this event
});
taskSharding.on('task-assigned', id => {
    ++currentlyAssigned;
    const task = taskStore.get(id); //do stuff
    debug("Assigned %j", id);
})
taskSharding.on('task-revoked', id => {
    --currentlyAssigned;
    debug("Revoked %s",id);
});

const ClusterMonitor = require("./cluster-monitor-zoologist");

const zkConnStr = `${process.env.ZK_PORT_2181_TCP_ADDR}:${process.env.ZK_PORT_2181_TCP_PORT}`;
console.log("Connecting to %s", zkConnStr);
const monitor = new ClusterMonitor({
    zkConnectionString: zkConnStr,
    basePath: 'services',
    serviceName: "example_service"
});

monitor.on('node-id',selfNode => {
    taskSharding.selfNode = selfNode;
});
monitor.on('node-list',nodes=> {
    currentNodeCount = nodes.length;
    taskSharding.setNodes(nodes);
});
