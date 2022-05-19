pipeline {
    agent { docker { image 'node:16.13.1-alpine'  }  }

    options {
        // This is required if you want to clean before build
        skipDefaultCheckout(true)
    }
    stages {
        stage('Checkout repository') {
            steps {
                // You can choose to clean workspace before build as follows
                //cleanWs()
                //checkout scm
                echo "Building ${env.JOB_NAME}..."

            }

        }
        stage('install') {
            steps {
                sh 'npm install'

            }

        }


    }

    post {
        always {
            echo 'This will always run'
            deleteDir()

        }
        success {
            echo 'This will run only if successful'

        }
        failure {
            echo 'This will run only if failed'

        }
        unstable {
            echo 'This will run only if the run was marked as unstable'

        }
        changed {
            echo 'This will run only if the state of the Pipeline has changed'
                echo 'For example, if the Pipeline was previously failing but is now successful'

        }

    }

}
