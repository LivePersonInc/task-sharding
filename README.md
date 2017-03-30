# task-sharding-demo

This project demonstrates sharding responsiblity between nodes in a cluster, using zookeeper and constitent hashing

## Usage

```js
const TaskSharding = require('../lib/task-sharding.js');
const zkConnStr = `${process.env.ZK_PORT_2181_TCP_ADDR}:${process.env.ZK_PORT_2181_TCP_PORT}`;

// Array of object with id property
const allTasks = [{ id: 1 },{ id: 2 },{ id: 3 }];

const taskSharding = new TaskSharding(zkConnStr, allTasks);

taskSharding.on('taskAdded', (newTaskConf, taskInfoAdder) => {
  // Your logic here
});

taskSharding.on('taskRemoved', (oldTaskInfo) => {
  // Your logic here
});
```

## Running the example

### Prerequisites

* docker-compose
* npm

### Running

In order to run it, download and unzip the repository. Then run:

```sh
cd task-sharding
npm install
cd examples
docker-compose up -d && docker-compose logs -f app
```
In the logs you can see the nodes' statements regarding their task responsablity.

You can addd nodes to the cluster by opening another shell window and:

```sh
cd task-sharding/examples
docker-compose scale app=5
```

In the logs you will see new nodes coming in and new work division. Then you can kill some of the nodes by cahnging the scale again:
```sh
docker-compose scale app=2
```



