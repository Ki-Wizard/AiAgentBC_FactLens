# FactLens AWS Evidence Corpus

이 문서는 Bedrock Knowledge Bases에 넣기 위한 최소 근거 문서다.

## AWS Lambda quotas

AWS Lambda function timeout quota is 900 seconds, which is 15 minutes.

Source: https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html

## Amazon S3 multipart upload limits

Amazon S3 multipart upload limits allow object sizes larger than 1 GB. The multipart upload limits table includes large object sizes and part sizes from 5 MiB to 5 GiB.

Source: https://docs.aws.amazon.com/AmazonS3/latest/userguide/qfacts.html

## Amazon DynamoDB database model

Amazon DynamoDB is a serverless, fully managed, distributed NoSQL database. DynamoDB does not support a JOIN operator.

Source: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Introduction.html

## Amazon Bedrock foundation models

Amazon Bedrock is a fully managed service that provides access to high-performing foundation models for building and scaling generative AI applications.

Source: https://docs.aws.amazon.com/bedrock/latest/userguide/what-is-bedrock.html

## Amazon Bedrock Knowledge Bases

Amazon Bedrock Knowledge Bases can use information from data sources to improve the relevance and accuracy of generated responses for RAG applications.

Source: https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base.html

## EC2 Spot Instance interruption

A Spot Instance interruption notice is issued two minutes before Amazon EC2 stops or terminates a Spot Instance.

Source: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-instance-termination-notices.html

## RAG limitation

RAG can improve response relevance and accuracy by using data sources, but the evidence does not guarantee that hallucinations completely disappear.

Source: https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base.html
