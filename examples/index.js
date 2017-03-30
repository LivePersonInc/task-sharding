const TaskSharding = require('../lib/task-sharding.js');
const zkConnStr = `${process.env.ZK_PORT_2181_TCP_ADDR}:${process.env.ZK_PORT_2181_TCP_PORT}`;
const allTasks = require('./tasks.json'); // config file

const taskSharding = new TaskSharding(zkConnStr, allTasks);

taskSharding.on('taskAdded', (newTaskConf, taskInfoAdder) => {
    console.log(`add ${newTaskConf.name}`);

    // store instance that will handle this task
    // Will be passed later on taskRemoved.
    taskInfoAdder({ myobj: "myobjdata", conf: newTaskConf });
});

taskSharding.on('taskRemoved', (oldTaskInfo) => {
    console.log(`remove ${oldTaskInfo.conf.name}`);    
});
