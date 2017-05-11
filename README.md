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
app_1  | 1 out of 12 tasks assigned - total 1 nodes: Assigned "id1"
app_1  | 2 out of 12 tasks assigned - total 1 nodes: Assigned "id246"
app_1  | 3 out of 12 tasks assigned - total 1 nodes: Assigned "id426"
app_1  | 4 out of 12 tasks assigned - total 1 nodes: Assigned "id66"
app_1  | 5 out of 12 tasks assigned - total 1 nodes: Assigned "id10"
app_1  | 6 out of 12 tasks assigned - total 1 nodes: Assigned "id11"
app_1  | 7 out of 12 tasks assigned - total 1 nodes: Assigned "id20"
app_1  | 8 out of 12 tasks assigned - total 1 nodes: Assigned "id25"
app_1  | 9 out of 12 tasks assigned - total 1 nodes: Assigned "id303"
app_1  | 10 out of 12 tasks assigned - total 1 nodes: Assigned "id111"
app_1  | 11 out of 12 tasks assigned - total 1 nodes: Assigned "id44"
app_1  | 12 out of 12 tasks assigned - total 1 nodes: Assigned "id12566"
app_1  | 12 out of 12 tasks assigned - total 1 nodes: Hashring updated.

# after docker-compose scale app=5
app_4  | 1 out of 12 tasks assigned - total 5 nodes: Assigned "id1"
app_4  | 2 out of 12 tasks assigned - total 5 nodes: Assigned "id426"
app_4  | 3 out of 12 tasks assigned - total 5 nodes: Assigned "id20"
app_4  | 4 out of 12 tasks assigned - total 5 nodes: Assigned "id111"
app_4  | 4 out of 12 tasks assigned - total 5 nodes: Hashring updated.
app_5  | 1 out of 12 tasks assigned - total 5 nodes: Assigned "id246"
app_1  | 11 out of 12 tasks assigned - total 5 nodes: Revoked id1
app_2  | 1 out of 12 tasks assigned - total 5 nodes: Assigned "id25"
app_5  | 2 out of 12 tasks assigned - total 5 nodes: Assigned "id10"
app_2  | 2 out of 12 tasks assigned - total 5 nodes: Assigned "id12566"
app_5  | 3 out of 12 tasks assigned - total 5 nodes: Assigned "id11"
app_2  | 2 out of 12 tasks assigned - total 5 nodes: Hashring updated.
app_1  | 10 out of 12 tasks assigned - total 5 nodes: Revoked id246
app_5  | 4 out of 12 tasks assigned - total 5 nodes: Assigned "id303"
app_1  | 9 out of 12 tasks assigned - total 5 nodes: Revoked id426
app_5  | 5 out of 12 tasks assigned - total 5 nodes: Assigned "id44"
app_1  | 8 out of 12 tasks assigned - total 5 nodes: Revoked id66
app_5  | 5 out of 12 tasks assigned - total 5 nodes: Hashring updated.
app_1  | 7 out of 12 tasks assigned - total 5 nodes: Revoked id10
app_1  | 6 out of 12 tasks assigned - total 5 nodes: Revoked id11
app_1  | 5 out of 12 tasks assigned - total 5 nodes: Revoked id20
app_1  | 4 out of 12 tasks assigned - total 5 nodes: Revoked id25
app_1  | 3 out of 12 tasks assigned - total 5 nodes: Revoked id303
app_1  | 2 out of 12 tasks assigned - total 5 nodes: Revoked id111
app_1  | 1 out of 12 tasks assigned - total 5 nodes: Revoked id44
app_1  | 0 out of 12 tasks assigned - total 5 nodes: Revoked id12566
app_1  | 0 out of 12 tasks assigned - total 5 nodes: Hashring updated.
app_3  | 1 out of 12 tasks assigned - total 5 nodes: Assigned "id66"
app_3  | 1 out of 12 tasks assigned - total 5 nodes: Hashring updated.

# after docker-compose scale app=1
examples_app_2 exited with code 137
examples_app_4 exited with code 137
examples_app_5 exited with code 137
examples_app_3 exited with code 137
app_1  | 1 out of 12 tasks assigned - total 1 nodes: Assigned "id1"
app_1  | 2 out of 12 tasks assigned - total 1 nodes: Assigned "id246"
app_1  | 3 out of 12 tasks assigned - total 1 nodes: Assigned "id426"
app_1  | 4 out of 12 tasks assigned - total 1 nodes: Assigned "id66"
app_1  | 5 out of 12 tasks assigned - total 1 nodes: Assigned "id10"
app_1  | 6 out of 12 tasks assigned - total 1 nodes: Assigned "id11"
app_1  | 7 out of 12 tasks assigned - total 1 nodes: Assigned "id20"
app_1  | 8 out of 12 tasks assigned - total 1 nodes: Assigned "id25"
app_1  | 9 out of 12 tasks assigned - total 1 nodes: Assigned "id303"
app_1  | 10 out of 12 tasks assigned - total 1 nodes: Assigned "id111"
app_1  | 11 out of 12 tasks assigned - total 1 nodes: Assigned "id44"
app_1  | 12 out of 12 tasks assigned - total 1 nodes: Assigned "id12566"
app_1  | 12 out of 12 tasks assigned - total 1 nodes: Hashring updated.
```

You can stop the servers using
```sh
cd task-sharding
npm stop
```

## Contributing

In lieu of a formal styleguide, take care to maintain the existing coding 
style. Add unit tests for any new or changed functionality, lint and test your code.

- To run lint and tests:
   
   ```sh
   npm test
   npm run lint
   ```

