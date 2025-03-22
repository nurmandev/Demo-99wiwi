#! /bin/bash

pm2 stop 0
rm -rf /apps/rbxchance-com

mkdir temp
unzip /root/deploy.zip -d temp
cp -R /root/temp /apps/rbxchance-com

rm -rf /root/temp

npm i --prefix /apps/rbxchance-com
pm2 start 0
