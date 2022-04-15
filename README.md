#### 删除远程tag
git tag
git tag -d 0.0.1
git push origin :0.0.1

npm whoami

#### 启动mango
mongod --dbpath /usr/local/var/mongodb

db.createUser(
  {
    user: "linzhenxin",
    pwd:  "123456789",
    roles: [ { role: "readWrite", db: "lzx-cli" } ],
    mechanisms : ["SCRAM-SHA-1"]
  }
)

db后面要加上一个authSource标记