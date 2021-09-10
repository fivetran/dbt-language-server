#!/bin/bash

wiremock_dir=$(dirname "$0")
cd ${wiremock_dir}
version=2.31.0
file_name=wiremock-jre8-standalone-${version}.jar

wget -nc https://repo1.maven.org/maven2/com/github/tomakehurst/wiremock-jre8-standalone/${version}/${file_name}
java -jar ${file_name}
