#!/bin/bash
sudo apt -y update
sudo apt -y install awscli
sudo apt -y install ruby
sudo apt -y install httpd
cd /home/ubuntu
aws s3 cp s3://aws-codedeploy-ap-south-1/latest/install . --region ap-south-1
chmod +x ./install
./install auto
