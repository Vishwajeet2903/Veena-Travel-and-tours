package com.veena.travel.repository;

import com.veena.travel.model.Booking;
import com.veena.travel.model.User;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BookingRepository extends JpaRepository<Booking, Long> {
  List<Booking> findByUserOrderByIdDesc(User user);

  @Query("select b from Booking b join fetch b.user where b.id = :id")
  Optional<Booking> findByIdWithUser(@Param("id") Long id);
}
