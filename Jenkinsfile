pipeline {
    agent { any { image 'node:16.13.1-alpine'  }  }
    stages {
        stage('Checkout repository') {
            steps {
                // You can choose to clean workspace before build as follows
                cleanWs()
                    checkout scm

            }

        }
        stage('install') {
            steps {
                // Clean before build
                cleanWs()
                    sh 'npm install'

            }

        }

    }

}
