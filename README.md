# task-sharding

[![npm version](https://img.shields.io/npm/v/task-sharding.svg)](https://www.npmjs.com/package/task-sharding)
[![npm downloads](https://img.shields.io/npm/dm/task-sharding.svg)](https://www.npmjs.com/package/task-sharding)
[![license](https://img.shields.io/npm/l/task-sharding.svg)](LICENSE)

This project demonstrates sharding responsiblity between nodes in a cluster, using zookeeper and constitent hashing

## Usage

### TaskSharding class

```js
const TaskSharding = require('task-sharding').TaskSharding;

new TaskSharding(
	'127.0.0.1:2181', // String, zooKeeper connection string
	[{ id: 1 },{ id: 2 },{ id: 3 }], // Array of tasks object with id property
	{
		serviceName: String, // path in the zooKeeper. Default is 'my/service/name/v1'.
		delay: Number, // miliseconds from cluster change till firing the 'taskAdded','taskRemoved'. Default is 1000.
	});
```

### Events

```js

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
git clone https://github.com/LivePersonInc/task-sharding.git
cd task-sharding
npm i
npm start
```
In the logs you can see the nodes' statements regarding their task responsablity.
You can addd nodes to the cluster by opening another shell window and:

```sh
cd task-sharding/examples
docker-compose scale app=10
```

In the logs you will see new nodes coming in and new work division. Then you can kill some of the nodes by cahnging the scale again:
```sh
cd task-sharding/examples
docker-compose scale app=1
```
The output should look like this:

```
app_1  | add Alice
app_1  | add Bob
app_1  | add Charlie
app_1  | add Dave
app_1  | add Eve

# after docker-compose scale app=5
app_1  | remove Alice
app_1  | remove Bob
app_1  | remove Charlie
app_1  | remove Dave
app_1  | remove Eve
app_2  | add Charlie
app_5  | add Eve
app_10 | add Bob
app_10 | add Dave
app_8  | add Alice

# after docker-compose scale app=1
examples_app_2 exited with code 137
examples_app_4 exited with code 137
examples_app_9 exited with code 137
examples_app_6 exited with code 137
examples_app_3 exited with code 137
examples_app_7 exited with code 137
examples_app_5 exited with code 137
examples_app_10 exited with code 137
examples_app_8 exited with code 137
app_1  | add Alice
app_1  | add Bob
app_1  | add Charlie
app_1  | add Dave
app_1  | add Eve
```

You can stop the servers using
```sh
cd task-sharding
npm stop
```
