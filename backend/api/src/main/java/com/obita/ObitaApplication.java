package com.obita;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.transaction.annotation.EnableTransactionManagement;

@SpringBootApplication(scanBasePackages = "com.obita")
@EnableScheduling
@EnableAsync
@EnableTransactionManagement
public class ObitaApplication {
    public static void main(String[] args) {
        SpringApplication.run(ObitaApplication.class, args);
    }
}
