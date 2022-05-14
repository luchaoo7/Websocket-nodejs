pipeline {
    agent { any { image 'node:16.13.1-alpine'  }  }

    options {
        // This is required if you want to clean before build
        skipDefaultCheckout(true)
    }
    stages {
        stage('Checkout repository') {
            steps {
                // You can choose to clean workspace before build as follows
                cleanWs()
                checkout scm
                echo "Building ${env.JOB_NAME}..."

            }

        }
        stage('install') {
            steps {
                // Clean before build
                sh 'npm install'

            }

        }

    }

}
