# task-sharding


[![build](https://api.travis-ci.org/LivePersonInc/task-sharding.svg?branch=master)](https://travis-ci.org/LivePersonInc/task-sharding)
[![npm version](https://img.shields.io/npm/v/task-sharding.svg)](https://www.npmjs.com/package/task-sharding)
[![npm downloads](https://img.shields.io/npm/dm/task-sharding.svg)](https://www.npmjs.com/package/task-sharding)
[![license](https://img.shields.io/npm/l/task-sharding.svg)](LICENSE)

This project demonstrates sharding responsiblity between nodes in a cluster, using consistent hashing

## Usage

### TaskSharding class

```js
const TaskSharding = require('task-sharding').TaskSharding;

const taskSharding = new TaskSharding({
    selfNode: "myNodeIdentifier"
});
listNodes().then(list => {
    taskSharding.addNode(list);
});

taskSharding.addTask("task1");
taskSharding.addTask("task2");
taskSharding.removeTask("task1");
taskSharding.addNode("other1");
taskSharding.addNode("other2");
taskSharding.addNode("other3");
taskSharding.removeNode("other2");


```

### Events

```js
let currentlyAssigned = 0;
taskSharding.on('task-assigned', id => {
    ++currentlyAssigned;
    debug("Task assigned %s",id);
})
taskSharding.on('task-revoked', id => {
    --currentlyAssigned;
    debug("Task revoked %s",id);
});

```

## Running the example


### Running

In order to run it, download and unzip the repository. Then run:

```sh
node examples/index.js
```
In the logs you can see this node's statements regarding its task responsibility.

In the logs you will see new nodes coming in and new work division. Then you can kill some of the nodes by cahnging the scale again:
```sh
cd task-sharding/examples
docker-compose scale app=1
```
The output should look like this:

```
(27 tasks over 8 nodes. 4 assigned): Adding node other6
(27 tasks over 8 nodes. 4 assigned): Added node other6
(27 tasks over 8 nodes. 4 assigned): Adding new task task90
(28 tasks over 8 nodes. 4 assigned): Adding new task task42
(29 tasks over 8 nodes. 4 assigned): Adding new task task31
(30 tasks over 8 nodes. 4 assigned): Adding new task task79
(31 tasks over 8 nodes. 4 assigned): Adding new task task100
(32 tasks over 8 nodes. 4 assigned): Making some random changes
(32 tasks over 7 nodes. 4 assigned): Removing node other8
(32 tasks over 7 nodes. 4 assigned): Removed node other8
(32 tasks over 7 nodes. 4 assigned): Deleting existing task task22
(31 tasks over 7 nodes. 4 assigned): Adding new task task64
(32 tasks over 7 nodes. 4 assigned): Adding new task task96
(33 tasks over 7 nodes. 4 assigned): Adding new task task81
(34 tasks over 7 nodes. 4 assigned): Adding new task task54
(35 tasks over 7 nodes. 4 assigned): Making some random changes
(35 tasks over 6 nodes. 4 assigned): Removing node other3

```


## Contributing

In lieu of a formal styleguide, take care to maintain the existing coding 
style. Add unit tests for any new or changed functionality, lint and test your code.

- To run lint and tests:
   
   ```sh
   npm test
   npm run lint
   ```


